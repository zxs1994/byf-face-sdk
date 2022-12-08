// import faceapi from 'face-api.js'
import { defineCustomElement } from 'vue'
import ByfFaceSdk, { ByfFaceSdkProps } from './ByfFaceSdk.ce.vue'
// 转换为自定义元素构造器
const ByfFaceSdkElement = defineCustomElement(ByfFaceSdk)
// 注册自定义元素
// 注册之后，所有此页面中的 `<my-vue-element>` 标签
// 都会被升级
customElements.define('byf-face-sdk', ByfFaceSdkElement)
import { VueElement } from "vue"

export declare interface ByfFaceInit {
  (box: HTMLDivElement, props: ByfFaceSdkProps): VueElement
}
const byfFaceInit: ByfFaceInit = (box, props) => {
	// 你也可以编程式地实例化元素：
	// （必须在注册之后）
	const element = new ByfFaceSdkElement(props)
	box.appendChild(element)
	return element
}
export {
	byfFaceInit,
}