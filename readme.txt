exportResult：开发环境的预览目录
	/css
	/image
	/js
	result.html(浏览器打开预览效果)

prodEnv：用于生产环境的资源目录
	/${config.name}/  		//图片资源文件夹
	/${config.name}.src.css	//样式文件
	/${config.name}.html	//html文件

app.js：程序入口文件
design.psd：pc设计稿(把pc设计稿命名成design.psd，放入目录下)
mobile.psd：移动端设计稿

config.json：配置文件
	isPc:Boolean//指定生成pc设计稿(px)，还是mobi设计稿(rem)
	name:String//指定prodEnv生成 config.name值
