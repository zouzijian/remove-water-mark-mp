const wsUrl = 'ws://127.0.0.1:5200'
// const wsUrl = 'wss://bear.todev.ink/ws'

export default class Websocket {
  constructor({heartCheck, isReconnection}) {
    // 是否连接
    this._isLogin = false
    // 当前网络状态
    this._netWork = true
    // 是否人为退出
    this._isClosed = false
    // 心跳检测频率
    this._timeout = 60000
    this._timeoutObj = null
    // 当前重连次数
    this._connectNum = 0
    // 心跳检测和断线重连开关，true为启用，false为关闭
    this._heartCheck = heartCheck
    this._isReconnection = isReconnection
    this._onSocketOpened()
    this._onSocketClosed()
    // 自定义连接成功后的回调函数
    this._customSocketOpened = null
  }

  // 心跳重置
  _reset() {
    clearTimeout(this._timeoutObj)
    return this
  }

  // 心跳开始
  _start() {
    let _this = this
    this._timeoutObj = setInterval(() => {
      wx.sendSocketMessage({
        data: JSON.stringify({
          'event': 'heartBeat'
        }),
        success(res) {
          console.log('发送心跳成功')
        },
        fail(err) {
          console.log(err)
          _this._reset()
        }
      })
    }, this._timeout)
  }

  // 监听websocket连接关闭
  _onSocketClosed() {
    wx.onSocketClose(err => {
      console.log('当前websocket连接已关闭,错误信息为:' + JSON.stringify(err))
      // 停止心跳连接
      if (this._heartCheck) {
        this._reset()
      }
      // 关闭已登录开关
      this._isLogin = false
      // 检测是否是用户自己退出小程序
      if (!this._isClosed) {
        // 进行重连
        if (this._isReconnection) {
          this._reConnect()
        }
      }
    })
  }

  // 检测网络变化
  onNetworkChange(options) {
    wx.onNetworkStatusChange(res => {
      console.log('当前网络状态:' + res.isConnected)
      if (!this._netWork) {
        this._isLogin = false
        // 进行重连
        if (this._isReconnection) {
          this._reConnect(options)
        }
      }
    })
  }

  _onSocketOpened() {
    wx.onSocketOpen(res => {
      console.log('websocket已打开')
      // 打开已登录开关
      this._isLogin = true
      // 发送心跳
      if (this._heartCheck) {
        this._reset()._start()
      }
      // 打开网络开关
      this._netWork = true
      // 如果有自定义函数则执行
      if (typeof this._customSocketOpened === 'function') {
        this._customSocketOpened()
      }
    })
  }

  // 自定义连接后的回调函数
  customSocketOpened(func) {
    if (typeof func === 'function') {
      this._customSocketOpened = func
    } else {
      console.log('参数的类型必须为函数')
    }
  }

  // 接收服务器返回的消息
  onReceivedMsg(callBack) {
    wx.onSocketMessage(msg => {
      // 如果返回的string是json，则自动解码
      var data = msg.data
      try {
        data = JSON.parse(msg.data)
      } catch (e) {
      }
      if (typeof callBack === 'function') {
        callBack(data)
      } else {
        console.log('参数的类型必须为函数')
      }
    })
  }

  // 建立websocket连接
  initWebSocket(options = {}) {
    let _this = this
    if (this._isLogin) {
      console.log('您已经登录了')
    } else {
      // 检查网络
      wx.getNetworkType({
        success(result) {
          if (result.networkType !== 'none') {
            // 开始建立连接
            wx.connectSocket({
              url: options.url ? options.url : wsUrl,
              success(res) {
                _this._connectNum = 0
                if (options.success !== undefined && typeof options.success === 'function') {
                  options.success(res)
                } else {
                  console.log('参数的类型必须为函数')
                }
              },
              fail(err) {
                if (options.fail === undefined) {
                  console.log(err)
                } else if (typeof options.fail === 'function') {
                  options.fail(err)
                } else {
                  console.log('参数的类型必须为函数')
                }
              }
            })
          } else {
            console.log('网络已断开')
            _this._netWork = false
            // 网络断开后显示model
            wx.showModal({
              title: '网络错误',
              content: '请重新打开网络',
              showCancel: false,
              success: function (res) {
                if (res.confirm) {
                  console.log('用户点击确定')
                }
              }
            })
          }
        }
      })
    }
  }

  // 发送websocket消息
  sendWebSocketMsg(options) {
    console.log(options)
    wx.sendSocketMessage({
      data: options.data,
      success(res) {
        if (typeof options.success === 'function') {
          options.success(res)
        } else if (options.success !== undefined) {
          console.log('参数的类型必须为函数')
        }
      },
      fail(err) {
        if (options.fail === undefined) {
          console.log(err)
        } else if (typeof options.fail === 'function') {
          options.fail(err)
        } else {
          console.log('参数的类型必须为函数')
        }
      }
    })
  }

  // 重连方法，会根据时间频率越来越慢
  _reConnect(options) {
    if (this._connectNum < 10) {
      setTimeout(() => {
        this.initWebSocket(options)
      }, 3000)
      this._connectNum += 1
    } else if (this._connectNum < 20) {
      setTimeout(() => {
        this.initWebSocket(options)
      }, 10000)
      this._connectNum += 1
    } else {
      setTimeout(() => {
        this.initWebSocket(options)
      }, 450000)
      this._connectNum += 1
    }
  }

  // 关闭websocket连接
  closeWebSocket() {
    wx.closeSocket()
    this._isClosed = true
  }
}
