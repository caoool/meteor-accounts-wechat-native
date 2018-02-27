import { Accounts } from 'meteor/accounts-base'
import { OAuth } from 'meteor/oauth'
import { HTTP } from 'meteor/http'
import { _ } from 'meteor/underscore'

WeChat = {
  serviceName: (Meteor.settings && Meteor.settings.public && Meteor.settings.public.wechatServiceName) || 'wechat'
}

Accounts.oauth.registerService(WeChat.serviceName);

const whitelistedFields = [
  'nickname',
  'sex',
  'language',
  'province',
  'city',
  'country',
  'headimgurl',
  'privilege'
]

const serviceName = WeChat.serviceName
const serviceVersion = 2
const serviceUrls = null
const serviceHandler = function (query) {
  var config = ServiceConfiguration.configurations.findOne({
    service: serviceName
  })
  if (!config)
    throw new ServiceConfiguration.ConfigError()

  var response = getTokenResponse(config, query)

  const expiresAt = (+new Date) + (1000 * parseInt(response.expiresIn, 10))
  const {
    accessToken,
    scope,
    openId,
    unionId
  } = response
  let serviceData = {
    accessToken,
    expiresAt,
    openId,
    unionId,
    scope,
    id: config.mainId === 'unionId' ? unionId : openId
  }

  if (response.refreshToken)
    serviceData.refreshToken = response.refreshToken

  var identity = getIdentity(accessToken, openId)
  var fields = _.pick(identity, whitelistedFields)
  _.extend(serviceData, fields)

  return {
    serviceData: serviceData,
    options: {
      profile: fields
    }
  }
}

var getTokenResponse = function (config, query) {
  var response
  try {
    response = HTTP.get(
      "https://api.weixin.qq.com/sns/oauth2/access_token", {
        params: {
          code: query.code,
          appid: config.appId,
          secret: OAuth.openSecret(config.secret),
          grant_type: 'authorization_code'
        }
      }
    )

    if (response.statusCode !== 200 || !response.content)
      throw {
        message: "HTTP response error",
        response: response
      }

    response.content = JSON.parse(response.content)
    if (response.content.errcode)
      throw {
        message: response.content.errcode + " " + response.content.errmsg,
        response: response
      }
  } catch (err) {
    throw _.extend(new Error("Failed to complete OAuth handshake with WeChat. " + err.message), {
      response: err.response
    })
  }

  return {
    accessToken: response.content.access_token,
    expiresIn: response.content.expires_in,
    refreshToken: response.content.refresh_token,
    scope: response.content.scope,
    openId: response.content.openid,
    unionId: response.content.unionid
  }
}

var getIdentity = function (accessToken, openId) {
  try {
    var response = HTTP.get("https://api.weixin.qq.com/sns/userinfo", {
      params: {
        access_token: accessToken,
        openid: openId,
        lang: 'zh-CN'
      }
    })

    if (response.statusCode !== 200 || !response.content)
      throw {
        message: "HTTP response error",
        response: response
      }

    response.content = JSON.parse(response.content)
    if (response.content.errcode)
      throw {
        message: response.content.errcode + " " + response.content.errmsg,
        response: response
      }

    return response.content
  } catch (err) {
    throw _.extend(new Error("Failed to fetch identity from WeChat. " + err.message), {
      response: err.response
    })
  }
}

// register OAuth service
OAuth.registerService(serviceName, serviceVersion, serviceUrls, serviceHandler)

// retrieve credential
WeChat.retrieveCredential = function (credentialToken, credentialSecret) {
  return OAuth.retrieveCredential(credentialToken, credentialSecret)
}

Accounts.addAutopublishFields({
  forLoggedInUser: _.map(
    whitelistedFields.concat(['accessToken', 'expiresAt']),
    function (subfield) {
      return 'services.' + serviceName + '.' + subfield
    }
  ),

  forOtherUsers: _.map(
    whitelistedFields,
    function (subfield) {
      return 'services.' + serviceName + '.' + subfield
    })
})

const handleAuthFromAccessToken = (accessToken, expiresAt, openId) => {
  const identity = getIdentity(accessToken, openId)

  const serviceData = {
    id: openId,
    accessToken,
    expiresAt,
  }

  const fields = _.pick(identity, whitelistedFields)
  _.extend(serviceData, fields)

  return {
    serviceData,
    options: {
      profile: {
        name: identity.nickname,
        sex: identity.sex,
        avatarUrl: identity.headimgurl, 
      }
    },
  }
}

Accounts.registerLoginHandler('wechatNativeLogin', params => {
  const data = params.wechatNativeLogin
  if (!data) {
    return undefined
  }

  const identity = handleAuthFromAccessToken(
    data.accessToken,
    (+new Date()) + (1000 * data.expirationTime),
    data.openId
  )

  return Accounts.updateOrCreateUserFromExternalService(
    
    'wechat', {
      ...identity.serviceData,
    },
    identity.options,
  )
})