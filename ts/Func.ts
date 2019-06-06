
import { PsdDeal } from "./PsdDeal";

export namespace Func {
  export interface Func {
      css: Function,
      html: Function,
      js: Function
  }
  export function getFunc(name:string): Func{
      
      if(name==="singleSwiper"){
          return SingleSwiper;
      }else if(name === "NumberScroll"){
          return NumberScroll;
      }

      return defaultFunc;
  }
}

let defaultFunc: Func.Func = {
  css: function(){
    return '';
  },
  html: function(){
    return '';
  },
  js: function(){
    return ''
  }
}

//单屏滚动
let SingleSwiper:  Func.Func = {
  css: function(){
      return `
      html,body{height: 100%;}
			.fk_pageWrap{height: 100%;overflow: hidden;}
      /* Pagination Styles */
              /*进度点处理*/
          .swiper-container-vertical > .swiper-pagination-bullets .swiper-pagination-bullet {margin: 0.05rem 0rem;}
          .swiper-container-vertical > .swiper-pagination-bullets .swiper-pagination-bullet-active{margin: 0.05rem 0rem;}
          .swiper-container-vertical > .swiper-pagination-bullets{right: 0.625rem;}
          /*进度点处理*/
          .swiper-pagination {
            font-size:0;
            position: absolute;
            text-align: center;
            -webkit-transition: 300ms;
            -moz-transition: 300ms;
            -o-transition: 300ms;
            transition: 300ms;
            -webkit-transform: translate3d(0, 0, 0);
            -ms-transform: translate3d(0, 0, 0);
            -o-transform: translate3d(0, 0, 0);
            transform: translate3d(0, 0, 0);
            z-index: 10;
          }
          .swiper-pagination.swiper-pagination-hidden {
            opacity: 0;
          }
          /* Common Styles */
          .swiper-pagination-fraction,
          .swiper-pagination-custom,
          .swiper-container-horizontal > .swiper-pagination-bullets {
            bottom: 0.10rem;
            left: 0;
            width: 100%;
          }
          /* Bullets */
          .swiper-pagination-bullet {
            width: 0.08rem;
            height: 0.08rem;
            display: inline-block;
            border-radius: 100%;
            background: rgb(75,141,230);
          }
          button.swiper-pagination-bullet {
            border: none;
            margin: 0;
            padding: 0;
            box-shadow: none;
            -moz-appearance: none;
            -ms-appearance: none;
            -webkit-appearance: none;
            appearance: none;
          }
          .swiper-pagination-clickable .swiper-pagination-bullet {
            cursor: pointer;
          }
          .swiper-pagination-white .swiper-pagination-bullet {
            background: #fff;
          }
          .swiper-pagination-bullet-active {
            opacity: 1;
            background: #007aff;
          }
          .swiper-pagination-white .swiper-pagination-bullet-active {
            background: #fff;
          }
          .swiper-pagination-black .swiper-pagination-bullet-active {
            background: #000;
          }
          .swiper-container-vertical > .swiper-pagination-bullets {
            right: 10px;
            top: 50%;
            -webkit-transform: translate3d(0px, -50%, 0);
            -moz-transform: translate3d(0px, -50%, 0);
            -o-transform: translate(0px, -50%);
            -ms-transform: translate3d(0px, -50%, 0);
            transform: translate3d(0px, -50%, 0);
          }
          .swiper-container-vertical > .swiper-pagination-bullets .swiper-pagination-bullet {
            margin: 0.05rem 0;
            display: block;
          }
          .swiper-container-horizontal > .swiper-pagination-bullets .swiper-pagination-bullet {
            margin: 0 0.05rem;
          }
          
          
          .swiper-pagination{
              position: fixed;
              right: 1rem;
              top: 50%;
              z-index: 999;
              width: 0.2rem;
              height: 2.2rem;
              margin-top: -1.1rem;
          }
          .swiper-pagination-bullet{
              position: relative;
              margin:  0.08rem 0.08rem;
          }
      `;
  },
  html: function(){
      return `
        <div class="J_pagination swiper-pagination swiper-pagination-clickable swiper-pagination-bullets">
          <div class="J_bullet swiper-pagination-bullet swiper-pagination-bullet-active"><b class="fk_focus_circle"></b></div>
          <div class="J_bullet swiper-pagination-bullet"><span class="fk_focus_circle"></span></div>
          <div class="J_bullet swiper-pagination-bullet"><span class="fk_focus_circle"></span></div>
          <div class="J_bullet swiper-pagination-bullet"><span class="fk_focus_circle"></span></div>
          <div class="J_bullet swiper-pagination-bullet"><span class="fk_focus_circle"></span></div>
          <div class="J_bullet swiper-pagination-bullet"><span class="fk_focus_circle"></span></div>
          <div class="J_bullet swiper-pagination-bullet"><span class="fk_focus_circle"></span></div>
          <div class="J_bullet swiper-pagination-bullet"><span class="fk_focus_circle"></span></div>
        </div>
      `;
  },
  js: function(){
      return `
          //单屏幕滚动效果
          var PRO = {};
          (function($, FUNC, undefined){
              $(function(){
                  var heightUnit = window.innerHeight;
                  function change(e){
                      FUNC.listenScroll(e);
                  }
                  // change = FUNC.delay(change);
                  $('body').on("mousewheel DOMMouseScroll", function(e){
      
                      if($('.J_wrap').is(":animated")){
                          return;
                      }
                      change(e);
                  });
      
                  var delayChangeToCurrentHandler = FUNC.delay(function(){
                      PRO.changeToCurrent();
                  }, 300);
                  $(window).on("resize", function(){
                      delayChangeToCurrentHandler();
                  });
              });
          }(jQuery, PRO));
          (function($, FUNC, undefined){
              FUNC.listenScroll = function(e){
                
                var delta = -e.originalEvent.wheelDelta || e.originalEvent.detail;//firefox使用detail:下3上-3,其他浏览器使用wheelDelta:下-120上120//下滚
                if(delta>0){
                  // console.log('下滚', currPageIndex);
                  FUNC.changeToNext();
                }
                //上滚
                if(delta<0){
                  // console.log('上滚', currPageIndex);
                  FUNC.changeToPrev();
                }
      
              };
      
              FUNC.changeToCurrent = function(){
                  FUNC.changeTo(currPageIndex);
              };
      
              var currPageIndex = 0;
              FUNC.changeToPrev = function(){
                  currPageIndex--;
                  if(currPageIndex<0){
                    currPageIndex=0;
                    return;
                  }
                  FUNC.changeTo(currPageIndex);
              };
              FUNC.changeToNext = function(){
                  currPageIndex++;
                  if(currPageIndex>7){
                    currPageIndex=7;
                    return;
                  }
      
                  FUNC.changeTo(currPageIndex);
              };
              FUNC.changeTo = function(index){
                  var offsetTop = index*FUNC.getHeightUnit();
                  $('.J_wrap').stop().animate({
                    marginTop: -offsetTop
                  }, 'easeOutQuart', function(){
                    FUNC.syncBullet(index);
                  });
              };
              FUNC.delay = function(handler, time){
                  time = time || 300;
                  var timer = null;
                  return function(){
                    var context = this;
                    var args = arguments;
                    clearTimeout(timer);
                    timer = setTimeout(function(){
                      handler.apply(context, args);
                    }, time);
                  };
              };
              FUNC.getHeightUnit = function(){
                return window.innerHeight;
              };
      
              FUNC.syncBullet = function(index){
                    var $pagination = $('.J_pagination');
                    $pagination.find('.J_bullet').removeClass("swiper-pagination-bullet-active");
                    $pagination.find('.J_bullet').eq(index).addClass("swiper-pagination-bullet-active");
      
                  $('.fk_page').removeClass("fk_page_active");
                  $('.fk_page').eq(index).addClass("fk_page_active");
              }
      
              $(function(){
                var $pagination = $('.J_pagination');
                  $pagination.on('click', '.J_bullet', function(){
                    var bulletIndex = $(this).index();
                    currPageIndex = bulletIndex;
                    FUNC.changeTo(bulletIndex);
                  });
              });
          }(jQuery, PRO));
          
      `;
  }
}

//数字滚动
let NumberScroll : Func.Func = {
  css: function(){
    return '';
  },
  html: function(){
    return ''
  },
  js: function(){
    return `
        
        (function($, FUNC, undefined){

          $(function(){
            FUNC.initNumberScroll();
          })
          FUNC.initNumberScroll = function(){
              var $number = $(".J_number");
              $number.each(function(index, number){
                  init($(number));
              })
          };

          function init($number){
                
              var maxNum = parseInt($number.attr("data-number")) || 0;
              if(maxNum === 0){
                  return;
              }

              var time = 1500;

              var start = Date.now();
              var timer = setInterval(function(){

                  var curr = Date.now();
                  var per = (curr - start)/time;
                  if(per>=1){
                    clearInterval(timer);
                  }

                  update(per);

              }, 1000/60);

              function update(per){

                  var offset = pageData.acctCount;
                  var count =  parseInt(offset*per) || 0;
                  $number.text(count);
              }
          }
        }(jQuery, PRO));
    `
  }
}