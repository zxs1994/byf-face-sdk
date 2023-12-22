<script setup lang="ts">
export interface Action {
	value: 0 | 1 | 2 | 3
	label: string
	voice?: string
}
export interface OnMediaRecorderStop {
	(data: {
		[propname: string]: any
		action_list: string
		// clip_times: ByfFaceSdkProps['clipTimes']
	}): Promise<boolean>
}
export interface ByfFaceSdkProps {
	DEV?: boolean
	takePhoto: boolean
	autoStart?: boolean
	videoWidth: number
	videoBitsPerSecond?: number
	// videoSize?: number
	// inputSize?: number
	// scoreThreshold?: number
	tooLeft?: string
	tooRight?: string
	tooFar?: string
	tooClose?: string
	detected?: string
	undetected?: string
	moreFace?: string
	endMsg?: string
	beginButText?: string
	clipTimes?: number
	actionList?: Action[]
	onMediaRecorderStop: OnMediaRecorderStop
	onGetUserMediaError: Function
}

import { onMounted, ref, nextTick } from 'vue'
// import * as faceapi from 'face-api.js'
console.log('版本号:2023-12-23 01')

const video = ref()
const playBut = ref()
const main = ref()
const warningMsg = ref('')

const activeIndex = ref(0)
const canStart = ref(false)
const recordingEnd = ref(false)
const testVideo = ref()
const firstRender = ref(false)
const audio = ref()
const errorMsg = ref('')
const errorBoxShow = ref(false)

const props = withDefaults(defineProps<ByfFaceSdkProps>(), {
	DEV: false,
	takePhoto: false,
	autoStart: false,
	videoWidth: 300,
	videoBitsPerSecond: 240000,
	tooLeft: 'Too left',
	tooRight: 'Too right',
	tooFar: 'Too far, please bring the phone closer',
	tooClose: 'Too close, please put your phone away',
	detected: 'Please keep your avatar in the middle of the screen.',
	undetected:
		'No face is found, please face the screen, no obscuration on the face',
	moreFace: 'More face is found',
	endMsg: 'The test is over and the audit is underway...',
	beginButText: 'Start',
	clipTimes: 5000,
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


let mediaRecorder: any // 录制器
const takePhoto = props.takePhoto || !MediaRecorder
// 如果自动开始或者是拍照片开始的按钮就不显示
const playButShow = ref(!(props.autoStart || takePhoto))

onMounted(async () => {
// 	await PromiseAll
	startVideo()
})
function download(url) {
	const name = new Date().toISOString()
	const a = document.createElement('a')
	a.style.display = 'none'
	a.download = `${name}.mp4`
	a.href = url
	document.body.appendChild(a)
	a.click()
}

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
			var getUserMedia =
				// @ts-ignore
				navigator.webkitGetUserMedia || navigator.mozGetUserMedia

			// 一些浏览器根本没实现它 - 那么就返回一个 error 到 promise 的 reject 来保持一个统一的接口
			if (!getUserMedia) {
				return Promise.reject(
					new Error('getUserMedia is not implemented in this browser')
				)
			}

			// 否则，为老的 navigator.getUserMedia 方法包裹一个 Promise
			return new Promise(function (resolve, reject) {
				getUserMedia.call(navigator, constraints, resolve, reject)
			})
		}
	}
}

Array.prototype.flatMap = function(callback) {
  return this.map(callback).reduce((acc, val) => acc.concat(val), [])
}

// 摄像头调用成功
function getUserMediaSucceed(stream: MediaStream) {
	// console.time('videoPlay')
	// console.time('渲染')
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
		console.log('video.value.onloadedmetadata')
		if (props.autoStart) {
			onButClick()
		}
	}
	if (props.autoStart) {
		setTimeout(() => {
			video.value.play()
			console.log('video.value.paused', video.value.paused)
			if (video.value.paused !== false) {
				console.log('没有按照预期自动开始,需要用户手动触发')
				canStart.value = false
				playButShow.value = true
			}
		}, 300)
	}
	if (takePhoto) {
		console.log('拍照')
		return
	}
	// 设置视频格式及编码
	function getAllSupportedMimeTypes(...mediaTypes) {
		if (!mediaTypes.length) mediaTypes.push(...['video', 'audio'])
		const FILE_EXTENSIONS = ['webm', 'ogg', 'mp4', 'x-matroska']
		const CODECS = ['vp9', 'vp9.0', 'vp8', 'vp8.0', 'avc1', 'av1', 'h265', 'h.265', 'h264', 'h.264', 'opus']
		
		return [...new Set(
			FILE_EXTENSIONS.flatMap(ext =>
				CODECS.flatMap(codec =>
					mediaTypes.flatMap(mediaType => [
						`${mediaType}/${ext};codecs:${codec}`,
						`${mediaType}/${ext};codecs=${codec}`,
						`${mediaType}/${ext};codecs:${codec.toUpperCase()}`,
						`${mediaType}/${ext};codecs=${codec.toUpperCase()}`,
						`${mediaType}/${ext}`,
					]),
				),
			),
		)].filter(variation => MediaRecorder.isTypeSupported(variation))
	}
	// console.log('flatMap', [].flatMap)
	const allSupportedMimeTypes = getAllSupportedMimeTypes('video')
	// console.log(allSupportedMimeTypes)
	const options = {
		// audioBitsPerSecond : 128000,
		videoBitsPerSecond: props.videoBitsPerSecond,
		mimeType: allSupportedMimeTypes[0]
	}
	mediaRecorder = new MediaRecorder(stream, options)
	console.log(mediaRecorder, mediaRecorder.mimeType)
	let fileList:any = []
	mediaRecorder.ondataavailable = async (e: { data: Blob }) => {
		// console.log(e)
		const fullBlob = new Blob([e.data], {
			type: allSupportedMimeTypes[0]
		})
		if (props.DEV) {
			let videoUrl = window.URL.createObjectURL(fullBlob)
			testVideo.value.src = videoUrl
			// download(videoUrl)
		}
		fileList.push(fullBlob)
		console.log(fullBlob, fullBlob.size)
		// 录制结束
		// console.log(activeIndex.value, props.actionList.length)
		if (fileList.length === props.actionList.length) {
			console.log('录制结束')
			canStart.value = false
			// canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
			warningMsg.value = ''
			recordingEnd.value = true
			const obj = {}
			fileList.map((v, i) => {
				obj['file' + (i + 1)] = v
			})
			const again = await props.onMediaRecorderStop({
				...obj,
				action_list: props.actionList.map((i) => i.value).join(),
				// clip_times: props.clipTimes,
			})
			if (again) {
				playButShow.value = true
				recordingEnd.value = false
				activeIndex.value = 0
				fileList = []
			}
		}
	}
	errorMsg.value = ''
}

// 调用媒体配置
const constraints = {
	video: {
		width: props.videoWidth,
		height: props.videoWidth,
		facingMode: 'user',
		frameRate: { ideal: 15, max: 30 },
	},
}
// window.onload = navigator.mediaDevices.enumerateDevices().then((res) => console.log(res))
function startVideo() {
	compatibleGetUserMedia()
	navigator.mediaDevices
		.getUserMedia(constraints)
		.then(getUserMediaSucceed)
		.catch((err) => {
			errorBoxShow.value = true
			errorMsg.value = err
			props.onGetUserMediaError(err)
		})
}

const videoOnplaying = async () => {
// 	canvas = faceapi.createCanvasFromMedia(video.value)!
// 	main.value.append(canvas)
// 	displaySize = { width: video.value.width, height: video.value.height }
// 	faceapi.matchDimensions(canvas, displaySize)
// 	// const detections = await faceapi
// 	// 	.detectAllFaces(
// 	// 		video.value,
// 	// 		new faceapi.TinyFaceDetectorOptions({
// 	// 			inputSize: inputSize,
// 	// 			scoreThreshold: scoreThreshold,
// 	// 		})
// 	// 	)
// 	// 	.withFaceLandmarks()
}

const videoOnpaused = () => {
	playButShow.value = true
	// mediaRecorderPause()
}
// 视频播放事件, 大概200多毫秒一次
const videoOntimeupdate = async () => {
	if (!firstRender.value) {
		firstRender.value = true
	}
	if (!canStart.value) return
	playButShow.value = false
	if (takePhoto) {
		
	} else {
		getState(props.detected)
	}
}
// 录制
const undetectedShowTextCount = 2 // 连续多少次没有检测到人脸或检测到多张人脸显示文案
let count = 0
function getState(msg: string) {
	if (msg === props.detected) {
		warningMsg.value = msg
		count = 0
		mediaRecorderStart()
	} else {
		if (mediaRecorder.state == 'recording') {
			addRecordingTime()
		} else {
			count += 1
			if (count >= undetectedShowTextCount) {
				warningMsg.value = msg
				console.log(msg)
			}
		}
	}
}

let time = 0
let recordingTime = 0

const onButClick = () => {
	if (errorMsg.value) {
		errorBoxShow.value = true
		return
	}
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
	if (props.actionList[activeIndex.value].voice) {
		// console.log(audio)
		// console.log(audio.value[activeIndex.value])
		audio.value.play()
	}
}
function addRecordingTime() {
	const nowTime = new Date().getTime()
	// console.log(nowTime - time)
	recordingTime += nowTime - time
	time = nowTime
	// console.log(recordingTime, props.clipTimes, activeIndex.value)
	if (recordingTime >= props.clipTimes) {
		recordingTime = 0
		mediaRecorderStop()
		// console.log(activeIndex.value, props.actionList.length - 1)
		if (activeIndex.value < props.actionList.length - 1) {
			activeIndex.value += 1
			mediaRecorderStart()
		} else {
			// mediaRecorderStop()
		}
	}
}

function mediaRecorderStart() {
	if (mediaRecorder.state === 'inactive') {
		mediaRecorder.start()
		console.log('开始')
		time = new Date().getTime()
		if (props.actionList[activeIndex.value].voice) {
			// console.log(audio)
			nextTick(() => audio.value.play())
		}
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
function videoCanplay() {
	console.log('videoCanplay')
}

function onTakePhoto() {
	console.log('拍照')
}
</script>
<template>
	<div class="byf-face-sdk">
		<div class="byf-face-sdk-title"></div>
		<div
			class="byf-face-sdk-main"
			ref="main">
			<video
				@canplay="videoCanplay"
				@playing.once="videoOnplaying"
				@timeupdate="videoOntimeupdate"
				@pause="videoOnpaused"
				ref="video"
				playsInline
				id="video"
				:width="300"
				:height="300"
				autoPlay
				muted />
			<div class="img-box">
				<img src="./face-outline.png" />
			</div>
			<template v-if="canStart && !takePhoto">
				<img src="./0.gif" v-if="actionList[activeIndex].value === 0" class="img-0">
				<img src="./1.gif" v-if="actionList[activeIndex].value === 1" class="img-1">
				<img src="./2.gif" v-if="actionList[activeIndex].value === 2" class="img-2">
				<img src="./3.gif" v-if="actionList[activeIndex].value === 3" class="img-3">
			</template>
		</div>
		<div class="msg-box">
			<div v-if="recordingEnd">{{ endMsg }}</div>
			<template v-else-if="canStart">
				<template v-if="firstRender">
					<div v-if="warningMsg === props.detected">
						{{ actionList[activeIndex].label }}
					</div>
					<div
						v-else
						style="color: red">
						{{ warningMsg }}
					</div>
				</template>
				<div v-else>loading...</div>
			</template>
		</div>
		<div>
			<button
				ref="playBut"
				v-show="playButShow"
				@click="onButClick"
				id="play-but">
				{{ beginButText }}
			</button>
			<button 
				v-if="!playButShow && takePhoto"
				@click="onTakePhoto">
			
			
			</button>
			<input 
				v-if="!playButShow && takePhoto" type="file" accept="image/*" capture="user"/>
		</div>
		<template v-if="actionList[0].voice && !takePhoto">
			<audio 
				:src="actionList[activeIndex].voice"
				v-show="false"
				ref="audio"></audio>
			<audio 
				:src="v.voice"
				v-show="false"
				v-for="(v, i) in actionList"
				:key="i"></audio>
		</template>
		<video
			v-if="DEV && !takePhoto"
			controls
			playsInline
			ref="testVideo"
			:width="300"
			:height="300"
			autoPlay
			muted />
		<div class="error-box-backdrop" v-if="errorBoxShow">
			<div class="error-box">
				<div class="error-box-center">
					<div class="error-box-center-title">Unable to record video.</div>
					<div class="error-box-center-text">Go to enable camera access or <br/> try a different browser.</div>
					<div class="error-box-center-text">NotAllowedError.</div>
				</div>
				<div class="error-box-bottom" @click="errorBoxShow = false">OK</div>
			</div>
		</div>
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

	#video {
		border-radius: 50%;
		object-fit: cover;
	}

	.byf-face-sdk-main {
		position: relative;
		margin: 0 auto;
		width: fit-content;
		transform: rotateY(180deg);
	}

	.byf-face-sdk-title {
		height: 100px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.img-box {
		width: 50%;

		img {
			width: 100%;
		}

		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}
	.img-0, .img-1, .img-2, .img-3 {
		position: absolute;
	}
	.img-0 {
		top: 0;
		right: 0;
	}
	.img-1 {
		top: 0;
		left: 0;
	}
	.img-2 {
		bottom: 0;
		right: 0;
	}
	.img-3 {
		bottom: 0;
		left: 0;
	}
	.play-but {
		display: none;
	}

	.msg-box {
		height: 50px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 500;
		font-size: 18px;
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
	.error-box-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.error-box {
		border-radius: 10px;
		overflow: hidden;
		width: 70vw;
		.error-box-center {
			background: #fff;
			padding: 15px;
			.error-box-center-title {
				font-size: 18px;
				font-weight: 600;
				padding-bottom: 5px;
			}
			.error-box-center-text {
				font-size: 14px;
				color: #666;
			}
		}
		.error-box-bottom {
			background: #fff;
			border-top: 1px solid #999;
			height: 44px;
			box-sizing: border-box;
			padding: 0 5px;
			overflow: hidden;
			font-size: 17px;
			line-height: 44px;
			color: #007aff;
			text-align: center;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}
}
</style>
