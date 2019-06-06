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
const Func_1 = require("./Func");
const psd = require("psd");
const path = require("path");
class PsdDeal {
    constructor(file, config) {
        this.source_timesamp = new Date().getTime(); //资源时间戳
        this.config = config;
        //这里做一些初始化工作
        this.uniqueId = 0;
        const psdLoaded = psd.fromFile(file);
        psdLoaded.parse(); //要执行一遍解析，后面的结果才能产出
        this.tree = psdLoaded.tree();
        this.psdJson = this.tree.export();
        this.initTree(this.tree);
        console.log("设计稿解析完毕");
    }
    initTree(tree) {
        this.reverseJsonChild(tree._children); //颠倒下顺序 ，使下面产生正常顺序的html（解析的结果，跟视觉上是相反的）
        this.renameTreeNode(tree);
        this.autoGenUniqueId(tree); //给树的每一个节点都打上id
        this.renameAllNode(tree); //重新命名节点
    }
    renameAllNode(tree) {
        this.eachTree(tree, function (node, index) {
            node.oldName = node.name;
            node.name = node.oldName + node.uid;
        });
    }
    eachTree(tree, callback) {
        var $self = this;
        this.eachNodes(tree._children, callback);
    }
    eachNodes(nodes, callback) {
        var $self = this;
        nodes.forEach(function (node, index) {
            if (node._children && node._children.length) {
                $self.eachNodes(node._children, callback);
            }
            else {
                callback(node, index);
            }
        });
    }
    getResult() {
        let cssList = [];
        let jsList = [];
        this.genBaseCss(cssList);
        this.genBaseJs(jsList);
        let html = this.genHtml(cssList);
        return {
            css: cssList.join(""),
            js: jsList.join(""),
            html: html
        };
    }
    getFuncResult() {
        let cssList = [];
        let jsList = [];
        let htmlList = [];
        //生产功能
        let funcHtmlList = [];
        this.config.funcList.forEach(function (funcName, index) {
            let func = Func_1.Func.getFunc(funcName);
            cssList.push(func.css());
            jsList.push(func.js());
            htmlList.push(func.html());
        });
        return {
            css: cssList.join(""),
            js: jsList.join(""),
            html: htmlList.join("")
        };
    }
    //产出基础样式
    genBaseCss(cssList) {
        var document = this.psdJson.document; //拿到psd文档
        cssList.push(`
            body{
                margin: 0;
            }
        `);
        let height = 0;
        if (this.config.device == "pc") {
            if (this.config.selfAdapt) {
                cssList.push(`
                    .fk_pageWrap{
                        position: relative;
                        width: 100%;
                        height: ${this.transUnit(document.height)};
                        margin:0 auto;
                        overflow: hidden;
                    }
                `);
                //容器居中
                cssList.push(`
                    .fk_contentWrap{
                        position: absolute;
                        width: 24rem;
                        height: ${this.transUnit(document.height)};
                        margin:0 auto;
                        left: 50%;
                        margin-left: -12rem;
                        overflow:hidden;
                    }
                `);
            }
            else {
                cssList.push(`
                    .fk_pageWrap{
                        position: relative;
                        min-width: 1200px;
                        height: ${this.transUnit(document.height)};
                        margin:0 auto;
                        overflow: hidden;
                    }
                `);
                //容器居中
                cssList.push(`
                    .fk_contentWrap{
                        position: absolute;
                        width: ${this.transUnit(document.width)};
                        height: ${this.transUnit(document.height)};
                        margin:0 auto;
                        left: 50%;
                        margin-left: -${this.transUnit(document.width / 2)};
                        overflow:hidden;
                    }
                `);
            }
        }
        else if (this.config.device == "mobi") {
            cssList.push(`
                .fk_contentWrap{
                    position: relative;
                    width: ${this.transUnit(document.width)};
                    height: ${this.transUnit(document.height)};
                    margin:0 auto;
                    overflow:hidden;
                }
            `);
        }
    }
    //产出基础脚本
    genBaseJs(jsList) {
        if (this.config.device == "pc") {
            if (this.config.selfAdapt) {
                jsList.push(`
                    (function(root){
                        function getRemUnit(){
                            var height = parseInt(window.innerHeight);
                            height = Math.min(height, 990);
                            return height/9.9;
                        }
                        function setRem(){
                            document.documentElement.style.fontSize = getRemUnit() + 'px';
                        }
                        root.onresize = setRem;
                        setRem();
                    }(window));
                `);
            }
        }
        else if (this.config.device == "mobi") {
            jsList.push(`
                (function(root){
                    function getRemUnit(){
                        var width = parseInt(getComputedStyle(document.documentElement).width);
                        width = Math.min(width, 750);
                        return width/7.5;
                    }
                    function setRem(){
                        document.documentElement.style.fontSize = getRemUnit() + 'px';
                    }
                    root.onresize = setRem;
                    setRem();
                }(window));
            `);
        }
    }
    //生成页面代码
    genHtml(cssList) {
        return this.getHtmlByTreeChilds(this.tree._children, this.tree.export().children, cssList, 4);
    }
    getHtmlByTreeChilds(treeNodeList, treeExportNodeList, cssList, level) {
        var $self = this;
        var htmlList = Array();
        htmlList.push("\n");
        /*
        1、相对父节点去定位，方便日后代码复用
            */
        treeNodeList.forEach(function (item, index) {
            let treeExportNode = treeExportNodeList[index];
            var content = "";
            var parent = item.parent;
            var spaceStr = new Array(4 * level).join(' ');
            var lineFeed = "";
            var isLineFeed = false;
            if ($self.isGroupVisible(item)) { //是一个分组
                if (item._children && item._children.length > 0) {
                    content = $self.getHtmlByTreeChilds(item._children, treeExportNode.children, cssList, level + 1);
                }
                isLineFeed = content.length > 0;
                lineFeed = isLineFeed ? "\n" : "";
                htmlList.push(spaceStr);
                htmlList.push('<div class="group_' + item.name + '">');
                htmlList.push(lineFeed);
                htmlList.push(content);
                htmlList.push(isLineFeed ? spaceStr : "");
                htmlList.push('</div>\n');
                cssList.push(`
                    .group_${item.name} {
                        position: absolute;
                        width: ${$self.transUnit(item.width)};
                        height: ${$self.transUnit(item.height)};
                        left: ${$self.transUnit(item.left - item.parent.left)};
                        top: ${$self.transUnit(item.top - item.parent.top)};
                    }
                `);
            }
            else if (item.type == "layer" && item.visible && $self.isGroupVisible(item.parent)) { //是一个层，被分组包含，分组可见
                // if(item._children && item._children.length>0){
                //     content = $self.getHtmlByTreeChilds(item._children, treeExportNode[index], cssList, level+1);
                // }
                cssList.push(`
                    .layer_${item.name} {
                        position: absolute;
                        width: ${$self.transUnit(item.width)};
                        height: ${$self.transUnit(item.height)};
                        left: ${$self.transUnit(item.left - item.parent.left)};
                        top: ${$self.transUnit(item.top - item.parent.top)};
                        background: url(./image/layer_${item.name}.png?v=${$self.source_timesamp}) no-repeat;
                        background-size: 100% auto;
                    }
                `);
                let contentText = "";
                //含有文文本节点
                if (treeExportNode.text && !treeExportNode.text.value.includes("\r")) { //文本节点且不存在换行的情况
                    let textNode = treeExportNode.text;
                    contentText = textNode.value; //获取文本
                    let textObj = textNode.font;
                    if (contentText.length > 10) { //字数较多的情况下，考虑扩充容器宽度
                        //ps里面的字体大小和px不是对应的，直接取文本图层的高度作为行高
                        cssList.push(`
                            .layer_${item.name} {
                                font-size: ${$self.transUnit(Math.min(item.height, textObj.sizes[0]))};
                                color: rgba(${textObj.colors[0].join(",")});
                                line-height:${$self.transUnit(item.height)};
                                background: none;
                                width: 200%;
                                text-align:center;
                                left: 0;
                                margin-left:-${$self.transUnit(item.parent.width / 2)};
                            }
                        `);
                    }
                    else {
                        //ps里面的字体大小和px不是对应的，直接取文本图层的高度作为行高
                        cssList.push(`
                            .layer_${item.name} {
                                font-size: ${$self.transUnit(Math.min(item.height, textObj.sizes[0]))};
                                color: rgba(${textObj.colors[0].join(",")});
                                line-height:${$self.transUnit(item.height)};
                                background: none;
                                width: 100%;
                                text-align:center;
                                left: 0;
                            }
                        `);
                    }
                }
                isLineFeed = content.length > 0;
                lineFeed = isLineFeed ? "\n" : "";
                htmlList.push(spaceStr + '<div class="layer_' + item.name + '">');
                htmlList.push(lineFeed);
                htmlList.push(contentText);
                htmlList.push(isLineFeed ? spaceStr : "");
                htmlList.push("</div>\n");
            }
        });
        return htmlList.join("");
    }
    transUnit(value) {
        if (this.config.device == "pc") {
            if (this.config.selfAdapt) {
                return value / 100 + 'rem';
            }
            else {
                return value + 'px';
            }
        }
        else {
            //默认是750的稿子
            return value / 100 + 'rem';
        }
    }
    //对文档树进行重新命名
    renameTreeNode(tree) {
        tree.descendants().forEach(function (node, index) {
            if (node.isGroup()) {
                node.originName = node.name;
                node.name = "group_" + index;
            }
            else if (node.type === "layer") {
                node.originName = node.name;
                node.name = "layer_" + index;
            }
        });
    }
    reverseJsonChild(jsonChilds) {
        var $self = this;
        jsonChilds.reverse(); //颠倒下顺序
        jsonChilds.forEach(function (child) {
            if (child._children && child._children.length > 0) {
                $self.reverseJsonChild(child._children);
            }
        });
    }
    autoGenUniqueId(tree) {
        this.genUniqueId(tree._children); //给每个节点都产生唯一的Id
    }
    //产生唯一的ID号码，关联样式、图片、css
    genUniqueId(jsonChilds) {
        var $self = this;
        jsonChilds.forEach(function (child) {
            $self.uniqueId++;
            child.uid = $self.uniqueId; //添加uid
            if (child._children) {
                $self.genUniqueId(child._children);
            }
        });
    }
    getLevel(item) {
        var level = 0;
        while (item) {
            level++;
            item = item.parent;
        }
        return level;
    }
    isGroupVisible(node) {
        return node && node.type == "group" && node.visible;
    }
    //图片都保存下来
    saveImgs(dirPath) {
        return __awaiter(this, void 0, void 0, function* () {
            var $self = this;
            var nodeList = this.tree.descendants();
            console.log("过滤不可见图层");
            var visibleNodeList = nodeList.filter(function (node) {
                let nodeArea = (node.right - node.left) * (node.bottom - node.top);
                if ($self.isGroupVisible(node.parent) //分组可见
                    && (node.type === "layer" && node.visible) //图层可见
                    && (nodeArea > 0) //不是空图层
                ) { //节点(图层可见，分组可见，节点不为空图层)
                    return true;
                }
                return false;
            });
            let nodeListLen = visibleNodeList.length;
            let savedCount = 0;
            console.log("保存中...");
            return Promise.all(visibleNodeList.map(function (node, index) {
                var imgPath = path.join(dirPath, 'layer_' + node.name + ".png");
                return node.saveAsPng(imgPath).then(function () {
                    savedCount++;
                    let precent = ((savedCount / nodeListLen) * 100);
                    let perStr = precent.toFixed(0) + "%";
                    console.log(`保存图片进度:${perStr}`);
                }).catch(function (err) {
                    console.log(err);
                });
            }));
        });
    }
}
exports.PsdDeal = PsdDeal;
