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

import { onMounted, ref } from 'vue'
import * as faceapi from 'face-api.js'

const video = ref()
const playBut = ref()
const main = ref()
const playButShow = ref(true)
const warningMsg = ref('')

const activeIndex = ref(0)
const canStart = ref(false)
const recordingEnd = ref(false)
const testVideo = ref()
const firstRender = ref(false)

const props = withDefaults(defineProps<ByfFaceSdkProps>(), {
	DEV: false,
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

let canvas: any
let displaySize: any

let mediaRecorder: any // ?????????
const videoWidth = 300 // ????????????
const videoHeight = videoWidth // ????????????
const inputSize = 128 // ?????????32??????
const scoreThreshold = 0.5 // ????????????

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

// ?????????????????????
function compatibleGetUserMedia() {
	// ??????????????????????????????????????? mediaDevices????????????????????????????????????????????????
	if (navigator.mediaDevices === undefined) {
		// @ts-ignore
		navigator.mediaDevices = {}
	}
	// ??????????????????????????? mediaDevices???????????????????????????????????? getUserMedia
	// ???????????????????????????????????????????????????????????????????????? getUserMedia ???????????????????????????
	if (navigator.mediaDevices.getUserMedia === undefined) {
		navigator.mediaDevices.getUserMedia = function (constraints) {
			// ?????????????????? getUserMedia ?????????????????????
			var getUserMedia =
				// @ts-ignore
				navigator.webkitGetUserMedia || navigator.mozGetUserMedia

			// ????????????????????????????????? - ????????????????????? error ??? promise ??? reject ??????????????????????????????
			if (!getUserMedia) {
				return Promise.reject(
					new Error('getUserMedia is not implemented in this browser')
				)
			}

			// ?????????????????? navigator.getUserMedia ?????????????????? Promise
			return new Promise(function (resolve, reject) {
				getUserMedia.call(navigator, constraints, resolve, reject)
			})
		}
	}
}

// ?????????????????????
function getUserMediaSucceed(stream: MediaStream) {
	// console.time('videoPlay')
	// console.time('??????')
	// ??????????????????????????? srcObject
	if ('srcObject' in video.value) {
		video.value.srcObject = stream
	} else {
		// ?????????????????????????????????????????????????????????????????????
		// @ts-ignore
		video.value.src = window.URL.createObjectURL(stream)
	}
	video.value.onloadedmetadata = function () {
		video.value.play()
	}

	mediaRecorder = new MediaRecorder(stream)
	mediaRecorder.ondataavailable = async (e: { data: Blob }) => {
		// ????????????
		canStart.value = false
		canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
		warningMsg.value = ''
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

// ??????????????????
const constraints = {
	video: {
		width: videoWidth,
		height: videoHeight,
		facingMode: 'user',
		frameRate: { ideal: 30, min: 10 },
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

const videoOnplaying = async () => {
	canvas = faceapi.createCanvasFromMedia(video.value)!
	main.value.append(canvas)
	displaySize = { width: video.value.width, height: video.value.height }
	faceapi.matchDimensions(canvas, displaySize)
	// const detections = await faceapi
	// 	.detectAllFaces(
	// 		video.value,
	// 		new faceapi.TinyFaceDetectorOptions({
	// 			inputSize: inputSize,
	// 			scoreThreshold: scoreThreshold,
	// 		})
	// 	)
	// 	.withFaceLandmarks()
}

const videoOnpaused = () => {
	playButShow.value = true
	mediaRecorderPause()
}
// ??????????????????, ??????200???????????????
const videoOntimeupdate = async () => {
	// console.log(e)
	// console.timeEnd('videoPlay')
	// console.time('??????')
	const detections = await faceapi
		.detectAllFaces(
			video.value,
			new faceapi.TinyFaceDetectorOptions({
				inputSize: inputSize,
				scoreThreshold: scoreThreshold,
			})
		)
		.withFaceLandmarks()

	const resizedDetections = faceapi.resizeResults(detections, displaySize)
	canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
	if (props.DEV) {
		// resizedDetections.length !== 0 && console.log(resizedDetections)
		// faceapi.draw.drawDetections(canvas, resizedDetections) // ??????
		faceapi.draw.drawFaceLandmarks(canvas, resizedDetections) // ??????
	}
	// console.timeEnd('??????')
	if (!firstRender.value) {
		firstRender.value = true
	}
	if (!canStart.value) return
	playButShow.value = false

	if (resizedDetections.length === 0) {
		getState(props.undetected)
	} else if (resizedDetections.length === 1) {
		const landmarks = resizedDetections[0].landmarks
		// console.log(landmarks.getJawOutline())
		// ????????????
		const jawOutline = landmarks.getJawOutline()
		const jawOutlineFirst = jawOutline[0]
		const jawOutlineEnd = jawOutline[jawOutline.length - 1]
		const difference = jawOutlineEnd.x - jawOutlineFirst.x
		// console.log(difference)
		if (difference <= 80) {
			getState(props.tooFar)
		} else if (difference >= 160) {
			getState(props.tooClose)
		} else if (jawOutlineFirst.x <= 0) {
			getState(props.tooRight)
		} else if (jawOutlineEnd.x >= videoWidth) {
			getState(props.tooLeft)
		} else {
			getState(props.detected)
		}
	} else {
		getState(props.moreFace)
	}
}
// ??????
const undetectedShowTextCount = 2 // ????????????????????????????????????????????????????????????????????????
let count = 0
function getState(msg: string) {
	if (msg === props.detected) {
		warningMsg.value = msg
		count = 0
		mediaRecorderStart()
	} else {
		mediaRecorderPause()
		count += 1
		if (count >= undetectedShowTextCount) {
			warningMsg.value = msg
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
		console.log('??????')
		time = new Date().getTime()
	} else if (mediaRecorder.state === 'paused') {
		mediaRecorder.resume()
		console.log('??????')
		time = new Date().getTime()
		// resume recording
	} else if (mediaRecorder.state == 'recording') {
		addRecordingTime()
	}
}
function mediaRecorderPause() {
	if (mediaRecorder.state == 'recording') {
		console.log('??????')
		mediaRecorder.pause()
		addRecordingTime()
	}
}
function mediaRecorderStop() {
	// console.log(mediaRecorder)
	if (mediaRecorder.state == 'recording' || mediaRecorder.state == 'paused') {
		console.log('??????')
		mediaRecorder.stop()
	} else {
		console.log('?????????!')
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
				@playing.once="videoOnplaying"
				@timeupdate="videoOntimeupdate"
				@pause="videoOnpaused"
				ref="video"
				playsInline
				id="video"
				:width="videoWidth"
				:height="videoHeight"
				autoPlay
				muted />
			<div class="img-box">
				<img src="./face-outline.png" />
			</div>
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
			<!-- <button @click="mediaRecorderStop">??????</button> -->
		</div>
		<video
			v-if="DEV"
			controls
			playsInline
			ref="testVideo"
			:width="videoWidth"
			:height="videoHeight"
			autoPlay
			muted />
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
}
</style>
