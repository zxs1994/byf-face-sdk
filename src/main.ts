import { byfFaceInit } from '../lib/main'
// import { byfFaceInit } from '../dist/byf-face-sdk.js'
console.log(byfFaceInit)
import './style.css'
import axios from 'axios'
function onMediaRecorderStop(data: any) {
  const request = axios.create()
  request.postForm('https://www.braininfra.ai/v3/api/liveness/detection/video', {
    ...data,
    task_id: '123',
    app_key: 'kkFVs_ZReKp7x-j7WR7TLw_RfSNbPl7E',
  })
}
function onGetUserMediaError(err: any) {
  console.log(err)
}
const props = {
  onMediaRecorderStop,
  onGetUserMediaError,
  DEV: true
}
const vueElement = byfFaceInit(document.querySelector<HTMLDivElement>('#app')!, props) 
console.log([vueElement])
// vueElement.DEV = false