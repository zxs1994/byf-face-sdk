import { byfFaceInit } from '../lib/main'
// import { byfFaceInit } from '../dist/byf-face-sdk.js'
console.log(byfFaceInit)
import './style.css'
// import axios from 'axios'
async function onMediaRecorderStop(data: any) {
  console.log(data)
  // const request = axios.create()
  // await request.postForm('https://www.braininfra.ai/v4/api/liveness/detection/video', {
  //   ...data,
  //   task_id: '123',
  //   app_key: 'kkFVs_ZReKp7x-j7WR7TLw_RfSNbPl7E',
  // })
  return true
}

// function onGetUserMediaError(err: any) {
//   // console.log(err)
// }
const props = {
  // errorBoxHtml: '123',
  // errorBoxOk: 'haha',
  onMediaRecorderStop,
  // onGetUserMediaError,
  DEV: true,
  // takePhoto: true,
  // audio: true,
  autoStart: true,
  actionList: [
    {
      value: 0,
      label: 'Please open your mouth',
      // voice: 'https://desk.braininfra.com/voice/pk_mouth.mp3',
    },
    // {
    //   value: 1,
    //   label: 'Please blink your eyes',
    //   // voice: 'https://desk.braininfra.com/voice/pk_eyes.mp3',
    // },
    // {
    //   value: 2,
    //   label: 'Please shake your head left and right',
    //   // voice: 'https://desk.braininfra.com/voice/pk_left_right.mp3',
    // },
    // {
    //   value: 3,
    //   label: 'Please nod your head up and down',
    //   // voice: 'https://desk.braininfra.com/voice/pk_up_down.mp3',
    // },
  ],
  videoWidth: 300,
}
// @ts-ignore
const vueElement = byfFaceInit(document.querySelector<HTMLDivElement>('#app')!, props) 
console.log([vueElement])
// vueElement.DEV = false
