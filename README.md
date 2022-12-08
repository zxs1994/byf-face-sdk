```js
// models文件夹需要放在根目录
// 根据路径引入
import { byfFaceInit } from 'byf-face-sdk.js'
const props = {
  // 录制结束
  onMediaRecorderStop(data) { // 可以返回一个promise，值为true时可以重新检测
    // 调用接口发起请求，需要额外参数task_id，app_key
    // 上传视频
    request.postForm('https://www.braininfra.ai/v3/api/liveness/detection/video', {
      ...data,
      task_id,
      app_key,
    }).then(res => {
		// 调用自己的后端接口拿结果
	})
  }，
  // 调用摄像头出错
  onGetUserMediaError(err) {
    
  }
}
// 第一个参数为容器，第二个参数为配置
byfFaceInit(box, props) 

// props 默认值
{
  DEV: false,
  videoSize: 300, // 视频尺寸
  inputSize: 128, // 要求被32整除
  scoreThreshold: 0.5, // 识别阀值
  tooFar: 'Too far, please bring the phone closer',
  tooClose: 'Too close, please put your phone away',
  detected: 'Please keep your avatar in the middle of the screen.',
  undetected: 'No face is found, please face the screen, no obscuration on the face',
  moreFace: 'More face is found',
  clipTimes: 5000, //每个动作录制时间
  endMsg: 'The test is over and the audit is underway...',
  actionList: [ // 动作组
    {
      value: 0,
      label: 'Please open your mouth',
    },
    {
      value: 1,
      label: 'Please blink your eyes',
    },
    {
      value: 2,
      label: 'Please shake your head left and right',
    },
    {
      value: 3,
      label: 'Please nod your head up and down',
    },
  ],
  beginButText: 'Start',
  onMediaRecorderStop: (data) => {
    console.log(data)
    return new Promise<boolean>((resolve, reject) => {
      resolve(false)
    })
  },
  onGetUserMediaError: (error) => {
    console.log(error)
  },
}
```