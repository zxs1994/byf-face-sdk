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
	}): Promise<boolean>
}
export interface ByfFaceSdkProps {
	DEV?: boolean
	takePhoto?: boolean
	autoStart?: boolean
	autoStartCountDown?: boolean
	videoWidth: number
	videoBitsPerSecond?: number
	endMsg?: string
	beginButText?: string
	errorBoxHtml?: string
	errorBoxOk?: string
	clipTimes?: number
	actionList?: Action[]
	onMediaRecorderStop: OnMediaRecorderStop
	onGetUserMediaError: Function
}

import { onMounted, ref, nextTick, onBeforeUnmount, defineExpose } from 'vue'
import axios from 'axios'

console.log('版本号:2024-11-06 01')

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

const countdownActive = ref(false)
const countdown = ref(3)
let intervalId: any = null
let frist = true // 页面首次录制

const startCountdown = (callback) => {
  if (countdownActive.value) return

  countdownActive.value = true
  countdown.value = 3

  intervalId = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
			clearInterval(intervalId)
			intervalId = null
			callback && callback()
      countdownActive.value = false
    }
  }, 1000)
}

const props = withDefaults(defineProps<ByfFaceSdkProps>(), {
	DEV: false,
	takePhoto: false,
	autoStart: false,
	autoStartCountDown: true, // autoStart: true 时, 默认开启倒计时, 
	videoWidth: 300,
	videoBitsPerSecond: 250000,
	endMsg: 'The test is over and the audit is underway...',
	beginButText: 'Start',
	errorBoxHtml: `<div class="error-box-center-title">Unable to record video.</div>
								<div class="error-box-center-text">Go to enable camera access or <br/> try a different browser.</div>
								<div class="error-box-center-text">NotAllowedError.</div>`,
	errorBoxOk: 'OK',
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
	onMediaRecorderStop: (data: any) => {
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
let takePhoto = props.takePhoto || !window.MediaRecorder
if (!window.MediaRecorder) {
	axios.get(`https://braininfra.ai/v1/api/err/trace?app_id=None&t=NoMediaRecorder`)
}
// 如果自动开始或者是拍照片开始的按钮就不显示
const playButShow = ref(!props.autoStart)

onMounted(async () => {
	startVideo()
})

onBeforeUnmount(() => {
	stopMedia && stopMedia()
	intervalId && clearInterval(intervalId)
	console.log('onBeforeUnmount')
})

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

// @ts-ignore
Array.prototype.flatMap = function (callback) {
	// @ts-ignore
  return this.map(callback).reduce((acc, val) => acc.concat(val), [])
}

let fileList: any = []
async function addFileItem(fullBlob: Blob) {
	fileList.push(fullBlob)
	console.log(fullBlob, fullBlob.size)
	// 录制结束
	// console.log(activeIndex.value, props.actionList.length)
	if (fileList.length === props.actionList.length) {
		console.log('录制结束')
		frist = false
		canStart.value = false
		// canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
		warningMsg.value = ''
		recordingEnd.value = true
		const obj = {}
		// @ts-ignore
		fileList.map((v, i) => {
			// @ts-ignore
			obj['file' + (i + 1)] = v
		})
		let again
		try {
			again = await props.onMediaRecorderStop({
				...obj,
				action_list: props.actionList.map((i) => i.value).join(),
			})
		} catch (e) {
			console.log(e)
			again = true
		}
		stopMedia!()
		if (again) {
			playButShow.value = true
			recordingEnd.value = false
			activeIndex.value = 0
			fileList = []
			takePhotoFlag.value = false
		}
	}
}

let getUserMediaSucceedFlag = false
let stopMedia: Function

const options: any = {
	// audioBitsPerSecond : 128000,
	videoBitsPerSecond: undefined,
	mimeType: undefined,
}

let recorder
function createMediaRecorder(stream: MediaStream, options) {
	if (!window.MediaRecorder) {
		// 没录制器
		takePhoto = true
		return
	}
	recorder = new MediaRecorder(stream, options)

	recorder.onerror = (event: any) => {
		console.error(`error recording stream: ${event.error.name}`)
	}
}
let recorderstartP
function recorderstart() {

	recorderstartP = new Promise<void>((resolve, reject) => {
		if (!recorder) {
			resolve()
			return
		}
		recorder.start()
		recorder.ondataavailable = async (e: { data: Blob }) => {
			console.log('测试录制器数据:', e.data.size, e.data.type)
			if (e.data.size === 0) {
				takePhoto = true
				axios.get(`https://braininfra.ai/v1/api/err/trace?app_id=None&t=videoSize0`)
			}
			if (e.data.type.indexOf('mp4') >= 0) {
				console.log('设置了videoBitsPerSecond')
				options.videoBitsPerSecond = props.videoBitsPerSecond
			}
			
			resolve()
		}
		recorder.onstart = () => {
			setTimeout(() => recorder.stop(), 300)
		}
		
	})
}

// 摄像头调用成功
async function getUserMediaSucceed(stream: MediaStream) {
	stopMedia = () => {
		stream.getTracks().forEach(track => track.stop())
		getUserMediaSucceedFlag = false
	}
	getUserMediaSucceedFlag = true
	if (navigator.userAgent.indexOf('UCBrowser') != -1) {
		throw('不支持uc浏览器')
	}
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
			if (props.autoStartCountDown && frist) {
				startCountdown(onButClick)
			} else {
				onButClick()
			}
		}
	}
	if (props.autoStart || takePhoto) {
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
	
	// 设置视频格式及编码
	function getAllSupportedMimeTypes(...mediaTypes: any) {
		if (!mediaTypes.length) mediaTypes.push(...['video', 'audio'])
		const FILE_EXTENSIONS = ['webm', 'ogg', 'mp4', 'x-matroska']
		const CODECS = ['vp9', 'vp9.0', 'vp8', 'vp8.0', 'avc1', 'av1', 'h265', 'h.265', 'h264', 'h.264', 'opus']
		
		return [...new Set(
			FILE_EXTENSIONS.flatMap(ext =>
				CODECS.flatMap(codec =>
					// @ts-ignore
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
	options.mimeType = allSupportedMimeTypes[0]

	createMediaRecorder(stream, options)
	recorderstart()
	await recorderstartP
	if (takePhoto) {
		return
	}

	console.log(options)
	mediaRecorder = new MediaRecorder(stream, options)
	console.log(mediaRecorder, mediaRecorder.mimeType)

	mediaRecorder.onerror = (event: any) => {
		console.error(`error recording stream: ${event.error.name}`)
	}

	mediaRecorder.ondataavailable = async (e: { data: Blob }) => {
		console.log('原数据:', e.data.size, e.data.type)
		const fullBlob = new Blob([e.data], {
			type: allSupportedMimeTypes[0]
		})
		if (props.DEV) {
			let videoUrl = window.URL.createObjectURL(fullBlob)
			testVideo.value.src = videoUrl
			// download(videoUrl)
		}
		console.log('录制视频：' + fullBlob.size, fullBlob.type)
		addFileItem(fullBlob)
	}
	errorMsg.value = ''
	errorBoxShow.value = false
}
const isAN00 = navigator.userAgent.indexOf('RMO-AN00') != -1
const videoWidth = isAN00 ? 300 : props.videoWidth
console.log(isAN00, videoWidth)
// 调用媒体配置
const constraints = {
	video: {
		width: videoWidth,
		height: videoWidth,
		facingMode: 'user',
		frameRate: { ideal: 15, max: 30 },
	},
}
function toError(err: any) {
	errorBoxShow.value = true
	errorMsg.value = err
	axios.get(`https://braininfra.ai/v1/api/err/trace?app_id=None&t=${err}`)
	props.onGetUserMediaError(err)
}
// window.onload = navigator.mediaDevices.enumerateDevices().then((res) => console.log(res))
async function startVideo() {
	compatibleGetUserMedia()
	return new Promise<void>((resolve, reject) => {
		navigator.mediaDevices
			.getUserMedia(constraints)
			.then(stream => {
				getUserMediaSucceed(stream)
				resolve()
			})
			.catch((err) => {
				toError(err)
				reject()
			})
	})
}

const videoOnplaying = async () => {

}

const videoOnpaused = () => {
	playButShow.value = true
	// mediaRecorderPause()
}

let takePhotoFlag = ref(false)

// 视频播放事件, 大概200多毫秒一次
const videoOntimeupdate = async () => {
	if (recorderstartP) {
		await recorderstartP
	} else {
		recorderstart()
		return
	}

	if (!firstRender.value) {
		firstRender.value = true
	}
	if (!canStart.value) return
	playButShow.value = false
	if (takePhoto) {
		onTakePhoto()
	} else {
		mediaRecorderStart()
	}
}

let time = 0
let recordingTime = 0

const onButClick = async () => {
	if (!getUserMediaSucceedFlag) {
		try {
			await startVideo()
		} catch (e) {
			return
		}
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
	time = new Date().getTime()
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

const imgSrc = ref('')
let imageType = 'image/jpeg'
function createCanvas() {
	const canvas = document.createElement('canvas')
	const context = canvas.getContext('2d')!
	canvas.width = videoWidth
	canvas.height = videoWidth

	// const hasWebp = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
	// imageType = hasWebp ? 'image/webp' : 'image/jpeg'

	return async function () {
		return new Promise<Blob>((resolve, reject) => {
			context.drawImage(video.value, 0, 0, videoWidth, videoWidth)
			canvas.toBlob(async (blob) => {
				// const buff = await blobToArrayBuffer(blob)
				// addFileItem(blob!)
				resolve(blob!)
				if(props.DEV) {
					const url = URL.createObjectURL(blob!)
					imgSrc.value = url
				}
			}, imageType, 0.5)

		})
	}
}

let getImg
let imageBlobs: any[] = []

async function onTakePhoto() {
	// takePhotoFlag.value = true
	if (takePhotoFlag.value) {
		return
	}

	if (!getImg) {
		getImg = createCanvas()
	}
	
	const nowTime = new Date().getTime()
	
	// console.log(nowTime - time)
	recordingTime += nowTime - time
	time = nowTime
	
	if (recordingTime >= props.clipTimes) {
		recordingTime = 0
		console.log(imageBlobs)
		const combinedBlob = new Blob(imageBlobs, { type: imageType })
		imageBlobs = []
		addFileItem(combinedBlob)
		// console.log(activeIndex.value, props.actionList.length - 1)
		if (activeIndex.value < props.actionList.length - 1) {
			activeIndex.value += 1
			if (props.actionList[activeIndex.value].voice) {
				// console.log(audio)
				nextTick(() => audio.value.play())
			}
		} else {
			console.log(activeIndex.value)
		}
	} else {
		const img = await getImg()
		imageBlobs.push(img)
	}
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
				width="300"
				height="300"
				autoPlay
				muted />
			<div class="img-box">
				<img src="./face-outline.png" />
			</div>

			<template v-if="canStart">
				<img src="./0.gif" v-if="actionList[activeIndex].value === 0" class="img-0">
				<img src="./1.gif" v-if="actionList[activeIndex].value === 1" class="img-1">
				<img src="./2.gif" v-if="actionList[activeIndex].value === 2" class="img-2">
				<img src="./3.gif" v-if="actionList[activeIndex].value === 3" class="img-3">
			</template>
		</div>
		<div class="msg-box">
			<div v-if="countdownActive" style="font-size: 20px;">{{ countdown }}</div>
			<div v-if="recordingEnd">{{ endMsg }}</div>
			<template v-else-if="canStart">
				<template v-if="firstRender">
						{{ actionList[activeIndex].label }}
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
		</div>
		<img :src="imgSrc" style="width: 300px; height: 300px;" v-if="DEV && takePhoto">
		<template v-if="actionList[0].voice">
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
				<div class="error-box-center" v-html="props.errorBoxHtml"></div>
				<div class="error-box-bottom" @click="errorBoxShow = false">{{ props.errorBoxOk }}</div>
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
		// object-fit: cover;
	}

	.byf-face-sdk-main {
		position: relative;
		margin: 0 auto;
		width: fit-content;
		transform: rotateY(180deg);
		// overflow: hidden;
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
