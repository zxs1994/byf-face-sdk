import fs from 'fs'

const sourcePath = 'dist/byf-face-sdk.js' // 设置源文件路径
const destinationPath = '../demo/byf-face-sdk.js' // 设置目标文件路径

// 复制文件
fs.copyFile(sourcePath, destinationPath, (err) => {
	if (err) {
		console.error('文件复制失败:', err)
	} else {
		console.log('文件复制成功')

		// // 移动文件到 demo 目录
		// const sourceFileName = path.basename(sourcePath) // 获取源文件名
		// const demoDirectory = '../demo' // 设置 demo 目录路径

		// // 创建 demo 目录（如果不存在）
		// if (!fs.existsSync(demoDirectory)) {
		// 	fs.mkdirSync(demoDirectory, { recursive: true })
		// }

		// // 构建目标文件的完整路径
		// const newDestinationPath = path.join(demoDirectory, sourceFileName)

		// // 重命名文件（实现移动文件）
		// fs.rename(destinationPath, newDestinationPath, (err) => {
		// 	if (err) {
		// 		console.error('文件移动失败:', err)
		// 	} else {
		// 		console.log('文件移动成功')
		// 	}
		// })
	}
})
