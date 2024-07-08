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
	videoWidth: number
	videoBitsPerSecond?: number
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

console.log('版本号:2024-05-29 01')

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
const takePhoto = props.takePhoto || !window.MediaRecorder
// 如果自动开始或者是拍照片开始的按钮就不显示
const playButShow = ref(!props.autoStart)

onMounted(async () => {
	startVideo()
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

Array.prototype.flatMap = function(callback) {
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
			takePhotoFlag.value = false
			countDown.value = 3
		}
	}
}

let getUserMediaSucceedFlag = false
// 摄像头调用成功
function getUserMediaSucceed(stream: MediaStream) {
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
			onButClick()
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
	if (takePhoto) {

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

	mediaRecorder.onerror = (event: any) => {
    console.error(`error recording stream: ${event.error.name}`);
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
		if (fullBlob.size === 0) {
			onTakePhoto()
		} else {
			addFileItem(fullBlob)
		}
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
let countDown = ref(3)
// 视频播放事件, 大概200多毫秒一次
const videoOntimeupdate = async () => {
	if (!firstRender.value) {
		firstRender.value = true
	}
	if (!canStart.value) return
	playButShow.value = false
	if (takePhoto) {
		if (!takePhotoFlag.value) {
			takePhotoFlag.value = true
			const s = setInterval(() => {
				if (countDown.value <= 0) {
					onTakePhoto()
					if (activeIndex.value < props.actionList.length - 1) {
						activeIndex.value += 1
						countDown.value = 3
						if (props.actionList[activeIndex.value].voice) {
							// console.log(audio)
							nextTick(() => audio.value.play())
						}
					} else {
						clearInterval(s)
					}
				} else {
					countDown.value--
				}
			}, 1000)
		}
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
function onTakePhoto() {
	const canvas = document.createElement('canvas')
	const context = canvas.getContext('2d')!
	canvas.width = videoWidth
	canvas.height = videoWidth
	context.drawImage(video.value, 0, 0, videoWidth, videoWidth)
	canvas.toBlob(async (blob) => {
		// const buff = await blobToArrayBuffer(blob)
		addFileItem(blob!)
		if(props.DEV) {
			const url = URL.createObjectURL(blob!)
			imgSrc.value = url
		}
	}, 'image/jpeg')
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
			<span v-if="takePhotoFlag && countDown !== 0" class="countDown">{{ countDown }}</span>
			<div style="--flaps: 6; width: 100%; height: 100%; overflow: hidden; border-radius: 50%; position: absolute; top: 0; left: 0" v-if="countDown === 0">
				<div class="flap" style="--i: 0"></div>
				<div class="flap" style="--i: 1"></div>
				<div class="flap" style="--i: 2"></div>
				<div class="flap" style="--i: 3"></div>
				<div class="flap" style="--i: 4"></div>
				<div class="flap" style="--i: 5"></div>
			</div>
			<template v-if="canStart">
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
			<!-- <button 
				v-if="!playButShow && takePhoto"
				@click="onTakePhoto">
				<svg t="1703309898876" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1488" width="30" height="30"><path d="M899.856074 857.576643 123.287419 857.576643c-31.780821 0-57.522088-27.592428-57.522088-61.625546L65.765331 318.473355c0-34.011628 25.742291-61.617359 57.522088-61.617359l176.717817 0c14.286378-10.69355 29.441543-28.754904 46.202275-57.896618 24.774243-43.040259 45.809325-37.754882 45.809325-37.754882l205.777667 0c0 0 63.917752 1.143033 81.644485 38.176484 14.611789 30.516014 30.503734 47.719838 43.904952 57.475016l176.511109 0 0-0.007163c31.782867 0 57.537438 27.598568 57.537438 61.61122L957.392488 795.951097C957.393511 829.984215 931.638941 857.576643 899.856074 857.576643zM511.470439 338.942549c-111.834065 0-202.485691 91.739401-202.485691 204.88432 0 113.155153 90.650603 204.882274 202.485691 204.882274 111.820762 0 202.498994-91.727121 202.498994-204.882274C713.969433 430.68195 623.292224 338.942549 511.470439 338.942549zM801.845853 311.37775c-18.611893 0-33.712823 15.312754-33.712823 34.217313 0 18.897396 15.101953 34.202986 33.712823 34.202986 18.640546 0 33.741475-15.305591 33.741475-34.202986C835.587328 326.690504 820.486398 311.37775 801.845853 311.37775zM511.579933 707.49037c-89.479941 0-162.024164-73.366961-162.024164-163.868161 0-90.506317 72.544223-163.878394 162.024164-163.878394 89.481987 0 162.02314 73.373101 162.02314 163.878394C673.603073 634.123408 601.06192 707.49037 511.579933 707.49037zM149.356145 174.918845l97.522104 0 0 41.794895-97.522104 0L149.356145 174.918845z" fill="#666666" p-id="1489"></path></svg>
			</button> -->
			<!-- <input v-if="!playButShow && takePhoto" type="file" accept="image/*" capture="user"/> -->
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
	.countDown {
		font-size: 30px;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%) rotateY(180deg);
		font-size: 60px;
		text-shadow: 1px 1px 0 #fff, -1px -1px 0 #fff;
	}

	.flap {
		width: 150vmax;
		height: 150vmax;
		position: absolute;
		bottom: 50%;
		right: 50%;
		pointer-events: none;
		will-change: transform;
		background: hsl(calc(1turn * var(--p)), 80%, 80%);
		background: linear-gradient(35deg, #555, black);
		border: solid 2px #999;
		--p: calc(var(--i) / var(--flaps));
		-webkit-animation: click 0.9s cubic-bezier(0.5, 0, 0.5, 1) 0.1s;
						animation: click 0.9s cubic-bezier(0.5, 0, 0.5, 1) 0.1s;
		transform-origin: bottom right;
		transform: rotate(-0.5turn) rotate(calc(1turn * var(--p))) skewX(30deg) translateX(-100%) translateY(90%);
	}
	@-webkit-keyframes click {
		48%, 52% {
			transform: rotate(-0.25turn) rotate(calc(1turn * var(--p))) skewX(30deg) translateX(0%) translateY(0%);
		}
	}
	@keyframes click {
		48%, 52% {
			transform: rotate(-0.25turn) rotate(calc(1turn * var(--p))) skewX(30deg) translateX(0%) translateY(0%);
		}
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
