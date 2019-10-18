import { DesignConfig, EnvConfig, BootConfig } from "./Config";
import { PsdDeal } from "./PsdDeal";
const cheerio = require('cheerio');
const fs = require("fs");
const path = require("path");
const rootPath = path.join(__dirname, "..");

//工具类
import { Utils } from "./uitls";
import { isObject } from "util";



class PsdToHtml{
    
    designConf:DesignConfig;
    devEnvConf:EnvConfig;
    prodEnvConf:EnvConfig;
    bootConf: BootConfig;
    psdFilePath: string;
    psdDeal:PsdDeal;

    constructor(bootConf: BootConfig, designConf:DesignConfig, devEnvConf:EnvConfig, prodEnvConf:EnvConfig, psdFilePath:string ){
        this.designConf = designConf;
        this.devEnvConf = devEnvConf;//测试环境
        this.prodEnvConf = prodEnvConf;//生产环境
        this.bootConf = bootConf;
        this.psdFilePath = psdFilePath;
        this.psdDeal = new PsdDeal(psdFilePath, designConf);
    }

    // 项目开始运行
    public async start(){
        await this.parsePsd();
        await this.saveToDev();
        await this.copyToProd();
    }

    private async parsePsd(){
        console.log("开始解析设计稿");
        this.psdDeal = new PsdDeal(this.psdFilePath, this.designConf);
        console.log("设计稿解析完毕");
    }

    // 保存到生产环境
    private async saveToDev(){
        
        console.log("页面开始生成");

        const config:EnvConfig = this.devEnvConf;
        let psdDeal:PsdDeal = this.psdDeal;

        let result = psdDeal.getResult();//获取加工后的结果
        let funcResult = psdDeal.getFuncResult();

        await this.clearEnv(this.devEnvConf);//清除环境
        
        console.log("开始保存图片...")
        await psdDeal.saveImgs(config.imgDir);


        console.log("判断图片是否可以自动转换成jpg");
        let pngToJpgList:Array<string> = await this.getPngsForPngToJpg(config.imgDir);//获取某个目录下可以转换成jsp的png图片
        console.log(`将${pngToJpgList.length}张图片从png压缩成jpg`);

        //转成服务器路径
        let pngFilePathList: Array<string> = pngToJpgList.map(function(pngName: string, index: number){
            let pngFilePath:string = path.join(config.imgDir, pngName);
            return pngFilePath;
        });

        //把样式里面的图片引用给替换掉
        let cssContent:string = this.replaceCssPngToJpg(result.css, pngToJpgList);
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

        console.log("保存css和html");
        return Promise.all([
            Utils.batchPngToJpg(pngFilePathList),//png转换jpg
            Utils.writeFile(config.css, cssContent),//保存样式
            Utils.writeFile(config.html, htmlData)//保存html
        ]).then(function(){
            console.log("页面生成结束")
        });
    }

    // 复制到生产环境
    private async copyToProd(){
        console.log("复制样式和代码到生产环境");

        let config:EnvConfig = this.prodEnvConf;
        let projectName = this.bootConf.name;
        let devEnvConfig = this.devEnvConf;
        
        //生成生产环境所用的物料
        this.clearEnv(this.prodEnvConf);

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
        
        //复制图片
        Utils.copyDir(devEnvConfig.imgDir, config.imgDir).then(function(){console.log("图片复制完毕")});
        Utils.writeFile(config.css, cssContent).then(function(){console.log("样式复制完毕")});
        Utils.writeFile(config.html, htmlData).then(function(){console.log("html复制完毕")});

    }

    
    
    private async clearEnv(config:EnvConfig){
        
        //清空目录
        Utils.clearDir(config.dir);//清除特定目录
        fs.mkdirSync(config.imgDir);//创建图片目录，把图片目录清除掉
        Utils.clearDir(config.imgDir);//把文件夹的内容清除掉
    }

    private replaceCssPngToJpg(css: string, pngNames: Array<string>){
        pngNames.forEach(function(pngName){
            let jpgName = pngName.replace("png", "jpg");
            var regExp:RegExp = new RegExp(pngName, "g");
            css = css.replace(regExp, jpgName);
        });
        return css;
    }
    
    private async getPngsForPngToJpg(dir:string){
        //将尺寸超过500K的图片转成jpg格式 且不透明的png图片进行转换
        let srcFiles:Array<any> = fs.readdirSync(dir);


        let bigSizeImgArr: Array<string> = srcFiles.filter(function(pngName: string, index:number){
            let pngPath:string = path.join(dir, pngName);
            let fileStats: any = fs.statSync(pngPath);
            const SIZE_LIMIT = 1024*150;//500K
            
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
    
}



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


    const psdFilePath:string = path.join(rootPath, "/design.psd");

    let bootConf:BootConfig = {
        name: config.name,
        type: config.type
    };

    let psdToHtml:PsdToHtml = new PsdToHtml(bootConf, designConfig, devEnvConfig, prodEnvConfig, psdFilePath);
    psdToHtml.start();


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
    let design1920PXConfig: DesignConfig = {
        device: "pc",
        selfAdapt: false,
        width: 1920,
        funcList: []
    };
    let design1920SelfConfig: DesignConfig = {
        device: "pc",
        selfAdapt: true,
        width: 1920,
        funcList: []
    };
    let design1920SingleSwiperConfig: DesignConfig = {
        device: "pc",
        selfAdapt: true,
        width: 1920,
        funcList: ["singleSwiper"]
    };

    if(type === 1){//移动端750设计稿
        return design750Config;
    }else if(type === 2){//pc端2400自适应式设计稿
        return design2400Config;
    }else if(type === 3){//pc端2400单屏滚动设计稿
        return design2400SingleSwiperConfig; 
    }else if(type === 4){//pc段1920px设计稿
        return design1920PXConfig;
    }else if(type == 5){//pc端1920自适应式设计稿
        return design1920SelfConfig;
    }else if(type == 6){//pc端1920单屏滚动设计稿
        return design1920SingleSwiperConfig;
    }

    return design750Config;
}



