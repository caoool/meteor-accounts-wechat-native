# Meteor WeChat Authentication Service

## Description
This package is written for Mobile and Native code. (no client UI added, only account service)

For example 
* react native
* [Meteor iOS](https://github.com/martijnwalraven/meteor-ios)
* [Android-DDP](https://github.com/delight-im/Android-DDP)
* ...

## Install
`meteor add service-configuration`

`meteor add caoool:accounts-wechat-native`

## Usage

### 1. First add this to your meteor server configuration

```javascript
ServiceConfiguration.configurations.upsert({
  service: WeChat.serviceName
}, {
  $set: {
      appId:  '<your-app-id>',
      secret: '<your-app-secret>',
      scope:  'snsapi_login',
      mainId: 'openId'
  }
})
```
> For detailed WeChat oauth login process, please consult [here](https://open.weixin.qq.com/cgi-bin/showdocument?action=dir_list&t=resource/res_list&verify=1&id=open1419317853&token=bc471660a7cfefbc39d51fd08322d81f715c392b&lang=en_US) 

### 2. Obtain access_token

```
HTTP request methods GET
https://api.weixin.qq.com/sns/oauth2/access_token?appid=APPID&secret=SECRET&code=CODE&grant_type=authorization_code
```

### 3. A success response will look like the following

```json
{
"access_token":   "ACCESS_TOKEN",
"expires_in":     7200,
"refresh_token":  "REFRESH_TOKEN",
"openid":         "OPENID",
"scope":          "SCOPE"
}
```

### 4. Make sure your native code or mobile application is connected to Meteor server through DDP protocal

### 5. Call meteor method to login use WeChat account service

```javascript
Meteor._login({
  wechatNativeLogin: {
    accessToken:  response.access_token,
    expiresAt:    response.expires_in,
    openId:       response.openid,
    refreshToken: response.refresh_token,
    scope:        response.scope,
    unionId:      response.unionid
  }
}, error => {
  console.log(error)
})
```

### 6. Newly created accounts will have user's WeChat info mapped to user.profile in Meteor
  * wechat `nickname` -> profile `name`
  * wechat `sex` -> profile `sex`
  * wechat `headimgurl` -> profile `avatarUrl`
