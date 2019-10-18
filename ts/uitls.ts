import { writeFile } from "fs";

const fs = require("fs");
const path = require("path");

export namespace Utils {
    export function clearDir (filePath: string): void {
        if(fs.existsSync(filePath)){
            deleteDir(filePath);
        }
        fs.mkdirSync(filePath);

    }
    export function deleteDir(filePath: string): boolean{
        var files = fs.readdirSync(filePath);
        if(fs.existsSync(filePath)) {
            files = fs.readdirSync(filePath);
            
            files.forEach(function(file:string, index: number) {
                var curPath = path.join(filePath , "/" , file);
                if(fs.statSync(curPath).isDirectory()) { // recurse
                    deleteDir(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            
            fs.rmdirSync(filePath);

        }else{
            return false;
        }

        return true;
    }

    export async function copyDir(srcDir:string, distDir: string){
        //判断是否存在
        if(!fs.existsSync(srcDir)){
            return false;
        }
        if(!fs.existsSync(distDir)){
            return false;
        }
        //判断是否是文件夹
        if(!fs.statSync(srcDir).isDirectory()){
            return false;
        }
        if(!fs.statSync(distDir).isDirectory()){
            return false;
        }
        //获取文件夹下的所有文件
        var srcFiles = fs.readdirSync(srcDir);
        
        let saveTasks =  srcFiles.filter(function(fileName:string, index: number){
            var srcFilePath = path.join(srcDir, fileName);
    
            var fileStats = fs.statSync(srcFilePath);
            if(fileStats.isDirectory()){//如果是目录，直接跳过
                return false;
            }
            return true;
        }).map(function(fileName:string, index: number){
            var srcFilePath = path.join(srcDir, fileName);
            var distFilePath = path.join(distDir, fileName);

            return copyFile(srcFilePath, distFilePath);
        });
        
        await Promise.all(saveTasks);
    }
    export function copyFile(src: string, dist: string){
        return new Promise(function(resolve, reject){

            fs.copyFile(src, dist, function(err: Error){
                if(err){
                    reject(err);
                }else{
                    resolve();
                }
            })

        });
    }
    export async function pngToJpg(pngPath: string, jpgPath:string){
        /*
        const images = require("images");
        //加载图片
        let $pngImg = images(pngPath);
        //解码成jpg格式
        $pngImg.encode("jpg");
        //保存
        $pngImg.save(jpgPath, {
            quality: 80
        });
        */
        const pngToJpeg = require('png-to-jpeg');
        let buffer:Buffer = await Utils.readFile(pngPath);
        let outputBuffer:Buffer = await pngToJpeg({quality: 80})(buffer);
        await Utils.writeFile(jpgPath, outputBuffer);
    }
    export async function batchPngToJpg(pngPathArr: Array<string>){
        return Promise.all(pngPathArr.map(function(pngPath: string){
            let jpgPath = pngPath.replace(".png", ".jpg");
            
            return pngToJpg(pngPath, jpgPath);
        }));
    }
    export async function is_png_exist_opacity(pngPath: string, percent: number):Promise<boolean>{
        if(!fs.existsSync(pngPath)){
            return false;
        }

        const PNG = require("pngjs").PNG;
        var $png:any = new PNG({
            filterType: 4
        });
        return new Promise(function(resolve: Function, reject: Function){
            fs.createReadStream(pngPath).pipe($png).on("parsed", function(){
                var $self:any = $png;
                let opacity:number=0;
                let total: number = 0;
                for (var y = 0; y < $self.height; y++) {
                    for (var x = 0; x < $self.width; x++) {
                        var idx = ($self.width * y + x) << 2;
        
                        // invert color
                        // this.data[idx] = 255 - this.data[idx];
                        // this.data[idx+1] = 255 - this.data[idx+1];
                        // this.data[idx+2] = 255 - this.data[idx+2];
        
                        // and reduce opacity
                        // $self.data[idx+3] = $self.data[idx+3] >> 1;
                        if($self.data[idx+3]<255){
                            opacity++;
                            total++;
                        }else{
                            total++;
                        }
                        
                    }
                }
                resolve(opacity/total*100 < percent);
            });
        });
    }
    function readIHDR(chunksBuf:Buffer):any{
        let offset:number = 0;
        //Length 和 Name(Chunk type) 位于每个数据块开头
        let byteInfo:any = {
            length: 4,
            chunkType: 4,
            CRC: 4
        };
    
        let length = chunksBuf.readUInt32BE(offset);offset+=byteInfo.length; //读取长度
        //let chunkType = chunksBuf.readUInt32BE(offset, byteInfo.chunkType);offset+=byteInfo.chunkType;//读取类型
        let name = chunksBuf.toString(undefined, offset, offset+=byteInfo.chunkType);//chunkType是一个字符串，只是以二进制存储到buffer
        let chunkDataBuf = chunksBuf.slice(offset, offset+=length);offset+=length;//截取chunk里面的buffer
        let CRC = chunksBuf.readUInt32BE(offset);offset+=byteInfo.CRC;//读取crc
    
    
        //把chunkDataBuf序列化 成对象
        let dataOffset = 0;
        let dataByteInfo:any = {
            width: 4,
            height: 4,
            bitDepth: 1,
            colourType: 1,
            compressionMethod: 1,
            filterMethod:1,
            interlaceMethod: 1
        };
    
        let info:any = {};

        info.width = chunkDataBuf.readUInt32BE(dataOffset);dataOffset+=dataByteInfo.width;
        info.height = chunkDataBuf.readUInt32BE(dataOffset);dataOffset+=dataByteInfo.height;
        info.bitDepth = chunkDataBuf.readUInt8(dataOffset);dataOffset+=dataByteInfo.bitDepth;
        info.colourType=chunkDataBuf.readUInt8(dataOffset);dataOffset+=dataByteInfo.colourType;
        info.compressionMethod=chunkDataBuf.readUInt8(dataOffset);dataOffset+=dataByteInfo.compressionMethod;
        info.filterMethod=chunkDataBuf.readUInt8(dataOffset);dataOffset+=dataByteInfo.filterMethod;
        info.interlaceMethod=chunkDataBuf.readUInt8(dataOffset);dataOffset+=dataByteInfo.interlaceMethod;
    
        info.length = 0;
        info.length += byteInfo.length;
        info.length += byteInfo.chunkType;
        info.length += chunkDataBuf.length;
        info.length += byteInfo.CRC;
    
        return info;
    }   

    function isPng(buffer: Buffer):boolean{
        let first8BytesBuf = buffer.slice(0, 8);
        let bytes = [137, 80, 78, 71, 13, 10, 26, 10];
        return bytes.every(function(byte, index){
            return byte === first8BytesBuf[index];
        });
    }
    function getPngSize(pngPath:string){
        let buffer = fs.readFileSync(pngPath);
        return getPngSizeByBuffer(buffer);
    }
    function getPngSizeByBuffer(buffer: Buffer){
        let defaultInfo = {
            width: 0,
            height: 0
        };
        if(!isPng(buffer)){
            return defaultInfo;
        }
        let chunksBuf = buffer.slice(8);
        let info:any = readIHDR(chunksBuf);
    
        return {
            width: info.width,
            height: info.height
        }

    }

    export function htmlDecode(str:string):string { 
        // 一般可以先转换为标准 unicode 格式（有需要就添加：当返回的数据呈现太多\\\u 之类的时）
        str = unescape(str.replace(/\\u/g, "%u"));
        // 再对实体符进行转义
        // 有 x 则表示是16进制，$1 就是匹配是否有 x，$2 就是匹配出的第二个括号捕获到的内容，将 $2 以对应进制表示转换
        str = str.replace(/&#(x)?(\w+);/g, function($, $1, $2) {
          return String.fromCharCode(parseInt($2, $1? 16: 10));
        });
        return str;
    }  

    export async function writeFile(filePath: string, content: any) {
        return new Promise(function(resolve, reject){
            fs.writeFile(filePath, content, function(err: Error){
                if(err){
                    reject(); 
                }else{
                    resolve(err);
                }
            })
        });
    }

    export async function readFile(filePath: string): Promise<Buffer>{
        return new Promise(function(resolve, reject){
            fs.readFile(filePath, function(err: Error, data: Buffer){
                if(err){
                    reject(err);
                }else{
                    resolve(data);
                }
            });
        });
    }

}