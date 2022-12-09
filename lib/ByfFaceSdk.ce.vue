<script setup lang="ts">
export interface Action {
	value: 0 | 1 | 2 | 3
	label: string
}
export interface OnMediaRecorderStop {
	(data: {
		video: Blob
		action_list: string
		clip_times: ByfFaceSdkProps['clipTimes']
	}): Promise<boolean>
}
export interface ByfFaceSdkProps {
	DEV?: boolean
	videoSize?: number
	inputSize?: number
	scoreThreshold?: number
	tooFar?: string
	tooClose?: string
	detected?: string
	undetected?: string
	moreFace?: string
	actionList?: Action[]
	clipTimes?: number
	endMsg?: string
	beginButText?: string
	onMediaRecorderStop: OnMediaRecorderStop
	onGetUserMediaError: Function
}

import { onMounted, ref } from 'vue'
import * as faceapi from 'face-api.js'

const video = ref()
const playBut = ref()
const main = ref()
const playButShow = ref(true)
const titleHtml = ref('')

const activeIndex = ref(0)
const canStart = ref(false)
const recordingEnd = ref(false)
const testVideo = ref()

const props = withDefaults(defineProps<ByfFaceSdkProps>(), {
	DEV: false,
	videoSize: 300, // 视频尺寸
	inputSize: 128, // 要求被32整除
	scoreThreshold: 0.5, // 识别阀值
	tooFar: 'Too far, please bring the phone closer',
	tooClose: 'Too close, please put your phone away',
	detected: 'Please keep your avatar in the middle of the screen.',
	undetected: 'No face is found, please face the screen, no obscuration on the face',
	moreFace: 'More face is found',
	clipTimes: 5000,
	endMsg: 'The test is over and the audit is underway...',
	actionList: () => [
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
})
console.log(props)

let canvas: any
let displaySize: any

let mediaRecorder: any // 录制器

const PromiseAll = Promise.all([
	faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
	faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
	// faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
	// faceapi.nets.faceExpressionNet.loadFromUri('/models'),
])

onMounted(async () => {
	await PromiseAll
	startVideo()
})
// function download(url) {
// 	const name = new Date().toISOString()
// 	const a = document.createElement('a')
// 	a.style.display = 'none'
// 	a.download = `${name}.mp4`
// 	a.href = url
// 	document.body.appendChild(a)
// 	a.click()
// }

// 兼容调用摄像头
function compatibleGetUserMedia() {
	// 老的浏览器可能根本没有实现 mediaDevices，所以我们可以先设置一个空的对象
	if (navigator.mediaDevices === undefined) {
		// @ts-ignore
		navigator.mediaDevices = {}
	}
	// 一些浏览器部分支持 mediaDevices。我们不能直接给对象设置 getUserMedia
	// 因为这样可能会覆盖已有的属性。这里我们只会在没有 getUserMedia 属性的时候添加它。
	if (navigator.mediaDevices.getUserMedia === undefined) {
		navigator.mediaDevices.getUserMedia = function (constraints) {

			// 首先，如果有 getUserMedia 的话，就获得它
			// @ts-ignore
			var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia

			// 一些浏览器根本没实现它 - 那么就返回一个 error 到 promise 的 reject 来保持一个统一的接口
			if (!getUserMedia) {
				return Promise.reject(new Error('getUserMedia is not implemented in this browser'))
			}

			// 否则，为老的 navigator.getUserMedia 方法包裹一个 Promise
			return new Promise(function (resolve, reject) {
				getUserMedia.call(navigator, constraints, resolve, reject)
			})
		}
	}
}

// 摄像头调用成功
function getUserMediaSucceed(stream: MediaStream) {
	// 旧的浏览器可能没有 srcObject
	if ('srcObject' in video.value) {
		video.value.srcObject = stream
	} else {
		// 防止在新的浏览器里使用它，应为它已经不再支持了
		// @ts-ignore
		video.value.src = window.URL.createObjectURL(stream)
	}
	video.value.onloadedmetadata = function () {
		video.value.play()
	}

	mediaRecorder = new MediaRecorder(stream)
	mediaRecorder.ondataavailable = async (e: {
		data: Blob
	}) => {
		// 录制结束
		canStart.value = false
		canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
		titleHtml.value = ''
		recordingEnd.value = true
		if (props.DEV) {
			let videoUrl = window.URL.createObjectURL(e.data)
			testVideo.value.src = videoUrl
			// download(videoUrl)
		}
		const again = await props.onMediaRecorderStop({
			video: e.data,
			action_list: props.actionList.map((i) => i.value).join(),
			clip_times: props.clipTimes,
		})
		if (again) {
			playButShow.value = true
			recordingEnd.value = false
			activeIndex.value = 0
		}
	}
}

// 调用媒体配置
const constraints = {
	video: {
		width: props.videoSize,
		height: props.videoSize,
		// sourceId: 'default',
		// facingMode: { exact: '' },
		// @ts-ignore
		// 放在app里面需要下面配置一下
		"permissions": {
			"audio-capture": {
				"description": "Required to capture audio using getUserMedia()"
			},
			"video-capture": {
				"description": "Required to capture video using getUserMedia()"
			}
		}
	},
}
// window.onload = navigator.mediaDevices.enumerateDevices().then((res) => console.log(res))
function startVideo() {
	compatibleGetUserMedia()
	navigator.mediaDevices
		.getUserMedia(constraints)
		.then(getUserMediaSucceed)
		.catch((err) => {
			props.onGetUserMediaError(err)
		})
}

const videoOnplaying = () => {
	canvas = faceapi.createCanvasFromMedia(video.value)!
	main.value.append(canvas)
	displaySize = { width: video.value.width, height: video.value.height }
	faceapi.matchDimensions(canvas, displaySize)
}

const videoOnpaused = () => {
	playButShow.value = true
	mediaRecorderPause()
}
// 视频播放事件, 大概200多毫秒一次
const videoOntimeupdate = async () => {
	// console.log(e)
	if (!canStart.value) return
	playButShow.value = false
	const detections = await faceapi
		.detectAllFaces(
			video.value,
			new faceapi.TinyFaceDetectorOptions({
				inputSize: props.inputSize,
				scoreThreshold: props.scoreThreshold,
			})
		)
		.withFaceLandmarks()

	const resizedDetections = faceapi.resizeResults(detections, displaySize)
	canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
	if (props.DEV) {
		// resizedDetections.length !== 0 && console.log(resizedDetections)
		// faceapi.draw.drawDetections(canvas, resizedDetections) // 位置
		faceapi.draw.drawFaceLandmarks(canvas, resizedDetections) // 轮廓
	}
	if (resizedDetections.length === 0) {
		getState(props.undetected)
	} else if (resizedDetections.length === 1) {
		const landmarks = resizedDetections[0].landmarks
		// console.log(landmarks.getJawOutline())
		// 下巴轮廓
		const jawOutline = landmarks.getJawOutline()
		const jawOutlineFirst = jawOutline[0]
		const jawOutlineEnd = jawOutline[jawOutline.length - 1]
		const difference = jawOutlineEnd.x - jawOutlineFirst.x
		// console.log(difference)
		if (difference <= 80) {
			getState(props.tooFar)
		} else if (difference >= 160) {
			getState(props.tooClose)
		} else {
			getState(props.detected)
		}
	} else {
		getState(props.moreFace)
	}
}
// 录制
const undetectedShowTextCount = 2 // 连续多少次没有检测到人脸或检测到多张人脸显示文案
let count = 0
function getState(msg: string) {
	if (msg === props.detected) {
		titleHtml.value = msg
		count = 0
		mediaRecorderStart()
	} else {
		mediaRecorderPause()
		count += 1
		if (count >= undetectedShowTextCount) {
			titleHtml.value = msg
			console.log(msg)
		}
	}
}

let time = 0
let recordingTime = 0

const onButClick = () => {
	video.value.play()
	if (canStart.value == true) {
		return
	}
	if (recordingEnd.value) {
		activeIndex.value = 0
	}
	canStart.value = true
	playButShow.value = false
	recordingEnd.value = false
}
function addRecordingTime() {
	const nowTime = new Date().getTime()
	// console.log(nowTime - time)
	recordingTime += nowTime - time
	time = nowTime
	// console.log(recordingTime, props.clipTimes, activeIndex.value)
	if (recordingTime >= props.clipTimes) {
		recordingTime = 0
		if (activeIndex.value < props.actionList.length - 1) {
			activeIndex.value += 1
		} else {
			mediaRecorderStop()
		}
	}
}

function mediaRecorderStart() {
	if (mediaRecorder.state === 'inactive') {
		mediaRecorder.start()
		console.log('开始')
		time = new Date().getTime()
	} else if (mediaRecorder.state === 'paused') {
		mediaRecorder.resume()
		console.log('继续')
		time = new Date().getTime()
		// resume recording
	} else if (mediaRecorder.state == 'recording') {
		addRecordingTime()
	}
}
function mediaRecorderPause() {
	if (mediaRecorder.state == 'recording') {
		console.log('暂停')
		mediaRecorder.pause()
		addRecordingTime()
	}
}
function mediaRecorderStop() {
	// console.log(mediaRecorder)
	if (mediaRecorder.state == 'recording' || mediaRecorder.state == 'paused') {
		console.log('停止')
		mediaRecorder.stop()
	} else {
		console.log('未开始!')
	}
}
</script>
<template>
	<div class="byf-face-sdk">
		<div class="byf-face-sdk-title" v-html="titleHtml"></div>
		<div class="byf-face-sdk-main" ref="main">
			<video @playing.once="videoOnplaying" @timeupdate="videoOntimeupdate" @pause="videoOnpaused" ref="video"
				playsInline id="video" :width="videoSize" :height="videoSize" autoPlay muted />
			<div class="img-box">
				<img src="./face-outline.png" />
			</div>
		</div>
		<div class="msg-box">
			{{
					recordingEnd ? endMsg : canStart ? actionList[activeIndex].label : ''
			}}
		</div>
		<div>
			<button ref="playBut" v-show="playButShow" @click="onButClick" id="play-but">
				{{ beginButText }}
			</button>
			<!-- <button @click="mediaRecorderStop">停止</button> -->
		</div>
		<video v-if="DEV" controls playsInline ref="testVideo" :width="videoSize" :height="videoSize" autoPlay muted />
	</div>
</template>
<style lang="less">
.byf-face-sdk {
	text-align: center;
	overflow: auto;

	canvas {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
	}

	video {
		object-fit: cover;
	}

	.byf-face-sdk-main {
		position: relative;
		margin: 0 auto;
	}

	.byf-face-sdk-title {
		height: 100px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.img-box {
		width: 180px;

		img {
			width: 100%;
		}

		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.play-but {
		display: none;
	}

	.msg-box {
		height: 50px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	button {
		border-radius: 8px;
		border: 1px solid transparent;
		padding: 0.6em 1.2em;
		font-size: 1em;
		font-weight: 500;
		font-family: inherit;
		background-color: #1a1a1a;
		cursor: pointer;
		transition: border-color 0.25s;
		background-color: #f9f9f9;
	}

	// button:hover {
	// 	border-color: #646cff;
	// }
}
</style>
