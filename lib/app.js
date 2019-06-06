"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const PsdDeal_1 = require("./PsdDeal");
const cheerio = require('cheerio');
const fs = require("fs");
const path = require("path");
const rootPath = path.join(__dirname, "..");
//工具类
const uitls_1 = require("./uitls");
function run(config) {
    console.log("开始运行");
    const projectName = config.name || "pro";
    const type = config.type || 1;
    let designConfig = getDesignConf(type);
    let devEnvConfig = {
        dir: path.join(rootPath, "/devEnv/result"),
        imgDir: path.join(rootPath, "/devEnv/result/image"),
        css: path.join(rootPath, "/devEnv/result/style.css"),
        js: path.join(rootPath, "/devEnv/result"),
        html: path.join(rootPath, "/devEnv/result/result.html"),
        template: path.join(rootPath, "/devEnv/template.html")
    };
    let prodEnvConfig = {
        dir: path.join(rootPath, "/prodEnv/result/"),
        imgDir: path.join(rootPath, `/prodEnv/result/${projectName}`),
        css: path.join(rootPath, `/prodEnv/result/${projectName}.src.css`),
        js: path.join(rootPath, "/prodEnv/result/"),
        html: path.join(rootPath, `/prodEnv/result/${projectName}.jsp`),
        template: path.join(rootPath, "/prodEnv/template.html")
    };
    let pathInfo = {
        design: path.join(rootPath, "/design.psd") //文件夹
    };
    console.log("解析设计稿中...");
    let psdDeal = new PsdDeal_1.PsdDeal(pathInfo.design, designConfig);
    console.log("生成开发环境代码...");
    //生成测试环境和生产环境的物料
    saveDevEnvResult(devEnvConfig, psdDeal, projectName).then(function () {
        console.log("生成生产环境代码...");
        copyDevToProdEnv(prodEnvConfig, devEnvConfig, projectName);
    });
}
exports.run = run;
//默认使用750设计稿
function getDesignConf(type) {
    let design750Config = {
        device: "mobi",
        selfAdapt: false,
        width: 750,
        funcList: []
    };
    let design2400Config = {
        device: "pc",
        selfAdapt: true,
        width: 2400,
        funcList: []
    };
    let design2400SingleSwiperConfig = {
        device: "pc",
        selfAdapt: true,
        width: 2400,
        funcList: ["singleSwiper"]
    };
    let design1920Config = {
        device: "pc",
        selfAdapt: false,
        width: 1920,
        funcList: []
    };
    if (type === 1) {
        return design750Config;
    }
    else if (type === 2) {
        return design2400Config;
    }
    else if (type === 3) {
        return design2400SingleSwiperConfig;
    }
    else if (type === 4) {
        return design1920Config;
    }
    return design750Config;
}
function saveDevEnvResult(config, psdDeal, projectName) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = psdDeal.getResult(); //获取加工后的结果
        let funcResult = psdDeal.getFuncResult();
        //清空目录
        uitls_1.Utils.clearDir(config.dir);
        fs.mkdirSync(config.imgDir);
        //保存图片
        uitls_1.Utils.clearDir(config.imgDir); //把文件夹的内容清除掉
        console.log("开始保存图片...");
        yield psdDeal.saveImgs(config.imgDir);
        console.log("判断图片是否可以自动转换成jpg");
        let pngNamesForTransToJpg = yield getPngNamesForTransToJpg(config.imgDir);
        //转成服务器路径
        let pngPathArr = pngNamesForTransToJpg.map(function (pngName, index) {
            let pngFilePath = path.join(config.imgDir, pngName);
            return pngFilePath;
        });
        //把样式里面的图片引用给替换掉
        let cssContent = replaceCssPngToJpg(result.css, pngNamesForTransToJpg);
        cssContent = cssContent + funcResult.css; //基础css和功能css放到同一个文件中
        //保存html保存内容中，如果含有中文，会被转成16进制...
        let templateBuffer = yield uitls_1.Utils.readFile(config.template);
        let $devEnvTemplate = cheerio.load(templateBuffer);
        //页面内容
        $devEnvTemplate(".J_wrap").html(result.html);
        //基础性脚本，比如rem适配
        $devEnvTemplate('#baseScript').text(result.js);
        //功能性html
        $devEnvTemplate(".J_pageWrap").append(funcResult.html);
        //功能性脚本
        $devEnvTemplate('#funcScript').text(funcResult.js);
        let htmlData = uitls_1.Utils.htmlDecode($devEnvTemplate.html()); //html方法把中文给转义了
        console.log("保存样式和html");
        return Promise.all([
            uitls_1.Utils.batchPngToJpg(pngPathArr),
            uitls_1.Utils.writeFile(config.css, cssContent),
            uitls_1.Utils.writeFile(config.html, htmlData) //保存html
        ]);
    });
}
//生产环境只是路径不一样罢了，应该是可以直接拷贝的
function copyDevToProdEnv(config, devEnvConfig, projectName) {
    return __awaiter(this, void 0, void 0, function* () {
        //生成生产环境所用的物料
        uitls_1.Utils.clearDir(config.dir); //清空目录
        fs.mkdirSync(config.imgDir); //创建图片目录
        //拷贝样式
        //将开发环境的css路径替换成生成环境
        var cssImgBase = `/image/${projectName}/`;
        let cssContent = fs.readFileSync(devEnvConfig.css).toString();
        cssContent = cssContent.replace(/\.\/image\//g, cssImgBase); //替换成生产环境的路径
        //拷贝html、js
        let $devHtml = cheerio.load(fs.readFileSync(devEnvConfig.html));
        //将内容复制到生成环境
        let $prodEnvTemplate = cheerio.load(fs.readFileSync(config.template));
        $prodEnvTemplate(".J_pageWrap").html($devHtml(".J_pageWrap").html()); //同步页面内容
        $prodEnvTemplate('#baseScript').html($devHtml("#baseScript").html()); //同步基础脚本
        $prodEnvTemplate('#funcScript').html($devHtml("#funcScript").html()); //同步功能脚本
        let htmlData = uitls_1.Utils.htmlDecode($prodEnvTemplate.html()); //html方法把中文给转义了
        console.log("复制样式和代码到生产环境");
        //复制图片
        uitls_1.Utils.copyDir(devEnvConfig.imgDir, config.imgDir).then(function () { console.log("图片复制完毕"); });
        uitls_1.Utils.writeFile(config.css, cssContent).then(function () { console.log("样式复制完毕"); });
        uitls_1.Utils.writeFile(config.html, htmlData).then(function () { console.log("html复制完毕"); });
    });
}
function replaceCssPngToJpg(css, pngNames) {
    pngNames.forEach(function (pngName) {
        let jpgName = pngName.replace("png", "jpg");
        var regExp = new RegExp(pngName, "g");
        css = css.replace(regExp, jpgName);
    });
    return css;
}
function getPngNamesForTransToJpg(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        //将尺寸超过500K的图片转成jpg格式 且不透明的png图片进行转换
        let srcFiles = fs.readdirSync(dir);
        let bigSizeImgArr = srcFiles.filter(function (pngName, index) {
            let pngPath = path.join(dir, pngName);
            let fileStats = fs.statSync(pngPath);
            const SIZE_LIMIT = 1024 * 500; //900K
            let isBigSize = fileStats.size >= SIZE_LIMIT;
            return isBigSize;
        });
        //判断图片是否半透明
        let allTask = bigSizeImgArr.map(function (pngName, index) {
            let pngPath = path.join(dir, pngName);
            //异步判断图片是否存在透明区域
            return uitls_1.Utils.is_png_exist_opacity(pngPath, 1).then(function (isOpacity) {
                return {
                    pngName: pngName,
                    isOpacity: isOpacity
                };
            });
        });
        //过滤出最终结果
        let allTaskInfo = yield Promise.all(allTask);
        return allTaskInfo.filter(function (info) {
            return info.isOpacity;
        }).map(function (info) {
            return info.pngName;
        });
    });
}
