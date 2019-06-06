//项目配置文件
export interface DesignConfig {
    device:string,//pc|mobi
    selfAdapt: boolean,//true|false
    width: number,
    funcList: Array<string>//页面的功能(单屏幕滚动，幻灯片播放等)
}

//环境配置文件
export interface EnvConfig {
    dir: string,
    imgDir: string,
    css: string,
    js: string,
    html: string,
    template: string
};
