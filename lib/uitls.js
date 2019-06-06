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
const fs = require("fs");
const path = require("path");
var Utils;
(function (Utils) {
    function clearDir(filePath) {
        if (fs.existsSync(filePath)) {
            deleteDir(filePath);
        }
        fs.mkdirSync(filePath);
    }
    Utils.clearDir = clearDir;
    function deleteDir(filePath) {
        var files = fs.readdirSync(filePath);
        if (fs.existsSync(filePath)) {
            files = fs.readdirSync(filePath);
            files.forEach(function (file, index) {
                var curPath = path.join(filePath, "/", file);
                if (fs.statSync(curPath).isDirectory()) { // recurse
                    deleteDir(curPath);
                }
                else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(filePath);
        }
        else {
            return false;
        }
        return true;
    }
    Utils.deleteDir = deleteDir;
    function copyDir(srcDir, distDir) {
        return __awaiter(this, void 0, void 0, function* () {
            //判断是否存在
            if (!fs.existsSync(srcDir)) {
                return false;
            }
            if (!fs.existsSync(distDir)) {
                return false;
            }
            //判断是否是文件夹
            if (!fs.statSync(srcDir).isDirectory()) {
                return false;
            }
            if (!fs.statSync(distDir).isDirectory()) {
                return false;
            }
            //获取文件夹下的所有文件
            var srcFiles = fs.readdirSync(srcDir);
            let saveTasks = srcFiles.filter(function (fileName, index) {
                var srcFilePath = path.join(srcDir, fileName);
                var fileStats = fs.statSync(srcFilePath);
                if (fileStats.isDirectory()) { //如果是目录，直接跳过
                    return false;
                }
                return true;
            }).map(function (fileName, index) {
                var srcFilePath = path.join(srcDir, fileName);
                var distFilePath = path.join(distDir, fileName);
                return copyFile(srcFilePath, distFilePath);
            });
            yield Promise.all(saveTasks);
        });
    }
    Utils.copyDir = copyDir;
    function copyFile(src, dist) {
        return new Promise(function (resolve, reject) {
            fs.copyFile(src, dist, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    Utils.copyFile = copyFile;
    function pngToJpg(pngPath, jpgPath) {
        return __awaiter(this, void 0, void 0, function* () {
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
            let buffer = yield Utils.readFile(pngPath);
            let outputBuffer = yield pngToJpeg({ quality: 80 })(buffer);
            yield Utils.writeFile(jpgPath, outputBuffer);
        });
    }
    Utils.pngToJpg = pngToJpg;
    function batchPngToJpg(pngPathArr) {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.all(pngPathArr.map(function (pngPath) {
                let jpgPath = pngPath.replace(".png", ".jpg");
                return pngToJpg(pngPath, jpgPath);
            }));
        });
    }
    Utils.batchPngToJpg = batchPngToJpg;
    function is_png_exist_opacity(pngPath, percent) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!fs.existsSync(pngPath)) {
                return false;
            }
            const PNG = require("pngjs").PNG;
            var $png = new PNG({
                filterType: 4
            });
            return new Promise(function (resolve, reject) {
                fs.createReadStream(pngPath).pipe($png).on("parsed", function () {
                    var $self = $png;
                    let opacity = 0;
                    let total = 0;
                    for (var y = 0; y < $self.height; y++) {
                        for (var x = 0; x < $self.width; x++) {
                            var idx = ($self.width * y + x) << 2;
                            // invert color
                            // this.data[idx] = 255 - this.data[idx];
                            // this.data[idx+1] = 255 - this.data[idx+1];
                            // this.data[idx+2] = 255 - this.data[idx+2];
                            // and reduce opacity
                            // $self.data[idx+3] = $self.data[idx+3] >> 1;
                            if ($self.data[idx + 3] < 255) {
                                opacity++;
                                total++;
                            }
                            else {
                                total++;
                            }
                        }
                    }
                    console.log("图片判断结果：", (opacity / total) * 100 < percent);
                    resolve(opacity / total * 100 < percent);
                });
            });
        });
    }
    Utils.is_png_exist_opacity = is_png_exist_opacity;
    function readIHDR(chunksBuf) {
        let offset = 0;
        //Length 和 Name(Chunk type) 位于每个数据块开头
        let byteInfo = {
            length: 4,
            chunkType: 4,
            CRC: 4
        };
        let length = chunksBuf.readUInt32BE(offset);
        offset += byteInfo.length; //读取长度
        //let chunkType = chunksBuf.readUInt32BE(offset, byteInfo.chunkType);offset+=byteInfo.chunkType;//读取类型
        let name = chunksBuf.toString(undefined, offset, offset += byteInfo.chunkType); //chunkType是一个字符串，只是以二进制存储到buffer
        let chunkDataBuf = chunksBuf.slice(offset, offset += length);
        offset += length; //截取chunk里面的buffer
        let CRC = chunksBuf.readUInt32BE(offset);
        offset += byteInfo.CRC; //读取crc
        //把chunkDataBuf序列化 成对象
        let dataOffset = 0;
        let dataByteInfo = {
            width: 4,
            height: 4,
            bitDepth: 1,
            colourType: 1,
            compressionMethod: 1,
            filterMethod: 1,
            interlaceMethod: 1
        };
        let info = {};
        info.width = chunkDataBuf.readUInt32BE(dataOffset);
        dataOffset += dataByteInfo.width;
        info.height = chunkDataBuf.readUInt32BE(dataOffset);
        dataOffset += dataByteInfo.height;
        info.bitDepth = chunkDataBuf.readUInt8(dataOffset);
        dataOffset += dataByteInfo.bitDepth;
        info.colourType = chunkDataBuf.readUInt8(dataOffset);
        dataOffset += dataByteInfo.colourType;
        info.compressionMethod = chunkDataBuf.readUInt8(dataOffset);
        dataOffset += dataByteInfo.compressionMethod;
        info.filterMethod = chunkDataBuf.readUInt8(dataOffset);
        dataOffset += dataByteInfo.filterMethod;
        info.interlaceMethod = chunkDataBuf.readUInt8(dataOffset);
        dataOffset += dataByteInfo.interlaceMethod;
        info.length = 0;
        info.length += byteInfo.length;
        info.length += byteInfo.chunkType;
        info.length += chunkDataBuf.length;
        info.length += byteInfo.CRC;
        return info;
    }
    function isPng(buffer) {
        let first8BytesBuf = buffer.slice(0, 8);
        let bytes = [137, 80, 78, 71, 13, 10, 26, 10];
        return bytes.every(function (byte, index) {
            return byte === first8BytesBuf[index];
        });
    }
    function getPngSize(pngPath) {
        let buffer = fs.readFileSync(pngPath);
        return getPngSizeByBuffer(buffer);
    }
    function getPngSizeByBuffer(buffer) {
        let defaultInfo = {
            width: 0,
            height: 0
        };
        if (!isPng(buffer)) {
            return defaultInfo;
        }
        let chunksBuf = buffer.slice(8);
        let info = readIHDR(chunksBuf);
        return {
            width: info.width,
            height: info.height
        };
    }
    function htmlDecode(str) {
        // 一般可以先转换为标准 unicode 格式（有需要就添加：当返回的数据呈现太多\\\u 之类的时）
        str = unescape(str.replace(/\\u/g, "%u"));
        // 再对实体符进行转义
        // 有 x 则表示是16进制，$1 就是匹配是否有 x，$2 就是匹配出的第二个括号捕获到的内容，将 $2 以对应进制表示转换
        str = str.replace(/&#(x)?(\w+);/g, function ($, $1, $2) {
            return String.fromCharCode(parseInt($2, $1 ? 16 : 10));
        });
        return str;
    }
    Utils.htmlDecode = htmlDecode;
    function writeFile(filePath, content) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(function (resolve, reject) {
                fs.writeFile(filePath, content, function (err) {
                    if (err) {
                        reject();
                    }
                    else {
                        resolve(err);
                    }
                });
            });
        });
    }
    Utils.writeFile = writeFile;
    function readFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(function (resolve, reject) {
                fs.readFile(filePath, function (err, data) {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(data);
                    }
                });
            });
        });
    }
    Utils.readFile = readFile;
})(Utils = exports.Utils || (exports.Utils = {}));
