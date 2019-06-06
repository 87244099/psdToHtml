import { DesignConfig, EnvConfig } from "./Config";
import { PsdDeal } from "./PsdDeal";
const cheerio = require('cheerio');
const fs = require("fs");
const path = require("path");
const rootPath = path.join(__dirname, "..");

//工具类
import { Utils } from "./uitls";
import { isObject } from "util";

export function run(config: any){
    console.log("开始运行");

    const projectName = config.name || "pro";
    const type = config.type || 1;
    let designConfig:DesignConfig = getDesignConf(type);

    let devEnvConfig: EnvConfig = {
        dir: path.join(rootPath, "/devEnv/result"),
        imgDir: path.join(rootPath, "/devEnv/result/image"),
        css: path.join(rootPath,  "/devEnv/result/style.css"),
        js: path.join(rootPath,  "/devEnv/result"),
        html:  path.join(rootPath, "/devEnv/result/result.html"),
        template: path.join(rootPath, "/devEnv/template.html")
    };

    let prodEnvConfig: EnvConfig = {
        dir: path.join(rootPath, "/prodEnv/result/"),
        imgDir: path.join(rootPath,  `/prodEnv/result/${projectName}`),
        css: path.join(rootPath,  `/prodEnv/result/${projectName}.src.css`),
        js: path.join(rootPath,  "/prodEnv/result/"),
        html: path.join(rootPath,  `/prodEnv/result/${projectName}.jsp`),
        template: path.join(rootPath, "/prodEnv/template.html")
    };

    interface pathInfo {
        design: string
    }

    let pathInfo: pathInfo = {
        design: path.join(rootPath, "/design.psd")//文件夹
    };

    console.log("解析设计稿中...");
    let psdDeal = new PsdDeal(pathInfo.design, designConfig);
    console.log("生成开发环境代码...");
    //生成测试环境和生产环境的物料
    saveDevEnvResult(devEnvConfig, psdDeal, projectName).then(function(){
        console.log("生成生产环境代码...");
        copyDevToProdEnv(prodEnvConfig, devEnvConfig, projectName);
    });

}
//默认使用750设计稿
function getDesignConf(type: number): DesignConfig{
    
    let design750Config: DesignConfig = {
        device:"mobi",
        selfAdapt: false,
        width: 750,
        funcList: []
    };
    let design2400Config: DesignConfig = {
        device: "pc",
        selfAdapt: true,
        width: 2400,
        funcList: []
    };
    let design2400SingleSwiperConfig: DesignConfig = {
        device: "pc",
        selfAdapt: true,
        width: 2400,
        funcList: ["singleSwiper"]
    };
    let design1920Config: DesignConfig = {
        device: "pc",
        selfAdapt: false,
        width: 1920,
        funcList: []
    };

    if(type === 1){
        return design750Config;
    }else if(type === 2){
        return design2400Config;
    }else if(type === 3){
        return design2400SingleSwiperConfig; 
    }else if(type === 4){
        return design1920Config;
    }

    return design750Config;
}


async function  saveDevEnvResult(config: EnvConfig, psdDeal: PsdDeal, projectName:string){
    
    let result = psdDeal.getResult();//获取加工后的结果
    let funcResult = psdDeal.getFuncResult();

    //清空目录
    Utils.clearDir(config.dir);
    fs.mkdirSync(config.imgDir);
    //保存图片
    Utils.clearDir(config.imgDir);//把文件夹的内容清除掉
    
    console.log("开始保存图片...")
    await psdDeal.saveImgs(config.imgDir);
    console.log("判断图片是否可以自动转换成jpg");
    let pngNamesForTransToJpg = await getPngNamesForTransToJpg(config.imgDir);
    //转成服务器路径
    let pngPathArr: Array<string> = pngNamesForTransToJpg.map(function(pngName: string, index: number){
        let pngFilePath:string = path.join(config.imgDir, pngName);
        return pngFilePath;
    });

    //把样式里面的图片引用给替换掉
    let cssContent:string = replaceCssPngToJpg(result.css, pngNamesForTransToJpg);
    cssContent = cssContent + funcResult.css;//基础css和功能css放到同一个文件中

    //保存html保存内容中，如果含有中文，会被转成16进制...
    let templateBuffer:any = await Utils.readFile(config.template);
    let $devEnvTemplate = cheerio.load(templateBuffer);
    //页面内容
    $devEnvTemplate(".J_wrap").html(result.html);
    //基础性脚本，比如rem适配
    $devEnvTemplate('#baseScript').text(result.js);

    //功能性html
    $devEnvTemplate(".J_pageWrap").append(funcResult.html);
    //功能性脚本
    $devEnvTemplate('#funcScript').text(funcResult.js);

    let htmlData = Utils.htmlDecode($devEnvTemplate.html());//html方法把中文给转义了

    console.log("保存样式和html");
    return Promise.all([
        Utils.batchPngToJpg(pngPathArr),//png转换jpg
        Utils.writeFile(config.css, cssContent),//保存样式
        Utils.writeFile(config.html, htmlData)//保存html
    ]);
}
//生产环境只是路径不一样罢了，应该是可以直接拷贝的
async function copyDevToProdEnv(config: EnvConfig, devEnvConfig: EnvConfig, projectName:string){
    //生成生产环境所用的物料

    Utils.clearDir(config.dir);//清空目录
    fs.mkdirSync(config.imgDir);//创建图片目录

    //拷贝样式
    //将开发环境的css路径替换成生成环境
    var cssImgBase = `/image/${projectName}/`;
    let cssContent = fs.readFileSync(devEnvConfig.css).toString();
    cssContent = cssContent.replace(/\.\/image\//g, cssImgBase);//替换成生产环境的路径

    //拷贝html、js
    let $devHtml:any = cheerio.load( fs.readFileSync(devEnvConfig.html));
    //将内容复制到生成环境
    let $prodEnvTemplate: any = cheerio.load(fs.readFileSync(config.template));
    $prodEnvTemplate(".J_pageWrap").html( $devHtml(".J_pageWrap").html() );//同步页面内容
    $prodEnvTemplate('#baseScript').html( $devHtml("#baseScript").html() );//同步基础脚本
    $prodEnvTemplate('#funcScript').html( $devHtml("#funcScript").html() );//同步功能脚本
    let htmlData = Utils.htmlDecode($prodEnvTemplate.html());//html方法把中文给转义了
    
    console.log("复制样式和代码到生产环境")

    
    //复制图片
    Utils.copyDir(devEnvConfig.imgDir, config.imgDir).then(function(){console.log("图片复制完毕")});
    Utils.writeFile(config.css, cssContent).then(function(){console.log("样式复制完毕")});
    Utils.writeFile(config.html, htmlData).then(function(){console.log("html复制完毕")});
}

function replaceCssPngToJpg(css: string, pngNames: Array<string>){
    pngNames.forEach(function(pngName){
        let jpgName = pngName.replace("png", "jpg");
        var regExp:RegExp = new RegExp(pngName, "g");
        css = css.replace(regExp, jpgName);
    });
    return css;
}

async function getPngNamesForTransToJpg(dir:string){
    //将尺寸超过500K的图片转成jpg格式 且不透明的png图片进行转换
    let srcFiles:Array<any> = fs.readdirSync(dir);
    let bigSizeImgArr: Array<string> = srcFiles.filter(function(pngName: string, index:number){
        let pngPath:string = path.join(dir, pngName);
        let fileStats: any = fs.statSync(pngPath);
        const SIZE_LIMIT = 1024*500;//900K
        
        let isBigSize:boolean = fileStats.size >= SIZE_LIMIT;
        
        return isBigSize;
    });
    //判断图片是否半透明
    let allTask:Array<Promise<{
        pngName: string,
        isOpacity: boolean
    }>>  = bigSizeImgArr.map(function(pngName: string, index:number){
        let pngPath:string = path.join(dir, pngName);
        //异步判断图片是否存在透明区域
        return Utils.is_png_exist_opacity(pngPath, 1).then(function(isOpacity){
            return {
                pngName: pngName,
                isOpacity: isOpacity
            }
        });
    });
    //过滤出最终结果
    let allTaskInfo:Array<{
        pngName: string,
        isOpacity: boolean}> = await Promise.all(allTask);

    return allTaskInfo.filter(function(info){
        return info.isOpacity;
    }).map(function(info){
        return info.pngName
    });
}

