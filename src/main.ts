import { byfFaceInit } from '../lib/main'
// import { byfFaceInit } from '../dist/byf-face-sdk.js'
console.log(byfFaceInit)
import './style.css'
import axios from 'axios'
async function onMediaRecorderStop(data: any) {
  // const request = axios.create()
  // await request.postForm('https://www.braininfra.ai/v4/api/liveness/detection/video', {
  //   ...data,
  //   task_id: '123',
  //   app_key: 'kkFVs_ZReKp7x-j7WR7TLw_RfSNbPl7E',
  // })
  return true
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
