```js
// models文件夹需要放在根目录
// 根据路径引入
import { byfFaceInit } from 'byf-face-sdk.js'
const props = {
  // 录制结束
  onMediaRecorderStop(data) {
    // 调用接口发起请求，需要额外参数task_id，app_key
    // 示例
    request.postForm('https://www.braininfra.ai/v3/api/liveness/detection/video', {
      ...data,
      task_id,
      app_key,
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
	DEV: false, // 测试
	videoSize: 300, // 视频大小
	inputSize: 128, // 脸大的大小 要求被32整除
	scoreThreshold: 0.5, // 识别阀值
	detected: '检测到一张人脸',
	undetected: '未检测到人脸',
	moreFace: '检测到多张人脸',
	clipTimes: 5000, // 一个动作的录制时间
	endMsg: '检测结束,审核中...',
	actionList: [
		{
			value: 0,
			label: '张张嘴',
		},
		{
			value: 1,
			label: '眨眨眼',
		},
		{
			value: 2,
			label: '摇摇头',
		},
		{
			value: 3,
			label: '点点头',
		},
	],
	beginButText: '开始检测',
	onMediaRecorderStop: (data) => {
		console.log(data)
	},
	onGetUserMediaError: (error) => {
		console.log(error)
	},
}
```