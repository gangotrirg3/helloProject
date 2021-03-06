import { Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { EventEmitter, Injectable, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import * as $ from 'jquery';
import { Subject, Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Images } from '../shared/images.model';
import { HeaderService } from '../services/header.service';
import { XmlModel,retain } from '../shared/xml-model';

declare var Tiff: any;
declare var $:any;

@Injectable()
export class ImageService implements OnInit {
  displayImages;

  ngOnInit(): void {
    this.imageLoaded
      .subscribe(
        (images: Images) => {
          console.log("imageLoaded:+++++++++++++++++++++++++++++ ");
        }
      );
      this.percentage = this.headerService.getpercentagevary();
      this.headerService.percentageChange
        .subscribe(
          (percent: number) => {
            this.percentage = percent;
          });
  }

  private serverImages: Images[] = [];
  private imagesUpdated = new Subject<{ serverImages: Images[] }>();
  private waveSub: Subscription;
  fit: string;
  fileName;
  public nextImages = false;
  public previousImages = false;
  imageCountChange = new EventEmitter<Number>();
  btnImgArrayChange = new EventEmitter<any>();
  imageLoaded = new EventEmitter<Images>();
  imagesModified = new EventEmitter<Images[]>();
  nextImageChange = new EventEmitter<boolean>();
  isSelectBlockChange = new EventEmitter<boolean>();
  displayChange = new EventEmitter<any>();
  nextValueChange = new EventEmitter<any>();
  previousImageChange = new EventEmitter<boolean>();
  documentChange = new EventEmitter<any>();
  fileNameChange = new EventEmitter<any>();
  invalidMessageChange = new EventEmitter<any>();
  images: Array<Images> = [];
  localImages : Array<Images> = [];
  imgFileCount = 0;
  ready = false;
  percentage: number;
  btnImgArray: any[] = [];
  public localUrl: any;
  public documentElement;
  //display='none';
  // public serverImages: any[] = [];
  postedImages: any;
  serverUrl: any
  dataUrl: any;
  xmlFileName;
  IMAGE_BACKEND_URL;
  XML_BACKEND_URL;
  invalidMessage;

  constructor(private http: HttpClient, private router: Router, private authService: AuthService,private headerService: HeaderService, @Inject(DOCUMENT) private document: Document) {
    this.IMAGE_BACKEND_URL = this.authService.BACKEND_URL + "/api/image/";
    this.XML_BACKEND_URL = this.authService.BACKEND_URL + "/api/xml/";
    console.log("IMAGE_BACKEND_URL "+this.IMAGE_BACKEND_URL);
    console.log("XML_BACKEND_URL "+this.XML_BACKEND_URL);
  }

  getImages() {
    return this.serverImages.slice();
  }

  getLocalImages(){
    return this.localImages.slice();
  }
  

  getBtnImages() {
    return this.btnImgArray.slice();
  }

  async getServerImages() {
    var user = this.authService.userName;

    const queryParams = `?user=${user}`;

    console.log("enter get server from screen")
    let promise = new Promise((resolve, reject) => {
      this.http
        .get<{ message: string; images: [] }>(
          this.IMAGE_BACKEND_URL + queryParams
        ).toPromise()
        .then(responseData => {
          const imageLength = responseData.images.length;
          if (imageLength > 0) {
            this.serverImages = responseData.images;
            console.log("message" + responseData.message);
            console.log("server images length--" + this.serverImages.length);
            this.imagesUpdated.next({
              serverImages: [...this.serverImages]
            });
          }
          else {
            console.log("message" + responseData.message);
            this.serverImages = responseData.images;
            this.imagesUpdated.next({
              serverImages: []
            });
          }
          resolve(this.serverImages);
        });
    });
    return promise;
  }

  getXmlFileAsJson(fileName : any) {
    console.log("file name in run ocr "+ fileName)
    var queryfileName = fileName.slice(0,-3) + 'xml';
    let userData : any;
    userData = {
      user : this.authService.userName
    }
      this.http
        .get<{ message: string; json:any }>(
          this.XML_BACKEND_URL + queryfileName).subscribe(responseData => {
          console.log("xml as json string "+JSON.stringify(responseData.json));
          XmlModel.jsonObject = responseData.json;
          this.updateXmlModel(XmlModel.jsonObject);
        });
  }

  updateXmlModel(jsonObj) {
    // var jsonObj = JSON.parse(json);
    var blocks = jsonObj['page'].block;
    console.log("block length " + blocks.length);
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i].line) {
        var lines = blocks[i].line;
        console.log("line====" + lines.length);
        for (var j = 0; j < lines.length; j++) {
          if (lines[j].word) {
            var txt = "";
            var words = lines[j].word;
            console.log("words length " + words.length);
            for (var k = 0; k < words.length; k++) {
              // console.log("word:", words[k]["$"].unicode);
              if (words[k].unicode != null) {
                txt = txt + " " + words[k].unicode;
              }
            }
            var lineRowStart = lines[j].rowStart;
            var lineRowEnd = lines[j].rowEnd;
            var lineColStart = lines[j].colStart;
            var lineColEnd = lines[j].colEnd;
            var lineNumber = lines[j].LineNumber;
            var blockNumber = blocks[i].BlockNumber;
            var txtwidth = (lineColEnd - lineColStart);
            var txtheight = (lineRowEnd - lineRowStart);
            var wordValue = new XmlModel(txt, lineRowStart, lineRowEnd, lineColStart, lineColEnd, txtwidth, txtheight,lineNumber,blockNumber);
            XmlModel.textArray.push(wordValue);
            console.log("textarray length" + XmlModel.textArray.length);
            XmlModel.textArray.slice(0, XmlModel.textArray.length);
            console.log("textarray after length" + XmlModel.textArray.length);
            console.log("text " + txt);
          }
        }
      }
    }
  }

  getImageUpdateListener() {
    return this.imagesUpdated.asObservable();
  }

  setDocumentId(element) {
    this.documentElement = element;
    this.documentChange.emit(this.documentElement);
  }

  getDocumentId() {
    return this.documentElement.slice();
  }

  urlChanged = new EventEmitter<string>();
  url: string;

  setUrl(localUrl) {
    this.url = localUrl;
    this.urlChanged.emit(this.url);
  }

  getUrl() {
    return this.url;
  }

  async addImage(fileRead) {
    // console.log("fileRead"+fileRead);
    const imageData = new FormData();
    imageData.append("email", this.authService.userName);
    // console.log("file name before server call "+fileRead[0].name.slice(0,-9));
    imageData.append("folderName",fileRead[0].name.slice(0,-9));
    for (let i = 0; i < fileRead.length; i++) {
      var file = fileRead[i];
      console.log(file.name);
      console.log(fileRead.length)
      imageData.append("image", file);
    }
    this.http
      .post<{ message: string }>(
        this.IMAGE_BACKEND_URL,
        imageData
      )
      .subscribe(async responseData => {
        this.invalidMessage = responseData.message;
        this.invalidMessageChange.emit(this.invalidMessage);
        console.log("image added+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++: " + responseData.message);
        // await this.getServerImages();
      });
    
    if(this.serverImages.length == 0) {
    this.localImages.splice(0, this.localImages.length);
    var filesCount = fileRead.length;
    if (filesCount > 1) {
      this.nextImages = false;
    }
    console.log("file count" + filesCount);
    for (let i = 0; i < filesCount; i++) {
      var isImage = fileRead[i].type.includes("image");
      if (isImage) {
        console.log("fileRead.type : " + fileRead[i].type);
        console.log("fileRead[" + i + "].name : " + fileRead[i].name);
        console.log("Inside service when pdf is selected length" + this.images.length)
        let dataURL = await this.loadLocalImages(fileRead, i);
        const imgValue = new Images(i, fileRead[i].name, 'N',this.authService.email,dataURL);
        this.localImages.push(imgValue);
        console.log("after sorting" + this.localImages[0].fileName);
        console.log("addImage: " + dataURL);
      }
  }
    this.localImages.sort( (a, b) => {
      var x = a.fileName.toLowerCase();
      var y = b.fileName.toLowerCase();
      if (x < y) {return -1;}
      if (x > y) {return 1;}
      return 0;
    });
    this.imagesModified.emit(this.localImages.slice());
    if(this.localImages.length > 1) {
      this.nextImages = false;
      this.nextImageChange.emit(this.nextImages);
    }
  }
    // if (this.serverImages.length > 0) {
    //   console.log("server images length===" + this.serverImages.length);
    //   // this.images.splice(0, this.images.length);
    //   var filesCount = this.serverImages.length;
    //   if (filesCount > 1) {
    //     this.nextImages = false;
    //   }
    //   console.log("file count" + filesCount);
    //   let dataURL = await this.loadArray(this.serverImages[0].fileName);
    //   this.serverUrl = dataURL
    //   console.log("server urlssssss" + this.serverUrl);
    //   this.urlChanged.emit(this.serverUrl.slice());
    //   console.log("(this.serverImages[0]: " + this.serverImages[0]);
    //   if (this.serverImages.length > 1) {
    //     this.nextImages = false;
    //     this.nextImageChange.emit(this.nextImages);
    //   }
    // }
  }

  async loadLocalImages(fileRead:any,i:number) {
    const result = await new Promise((resolve) => {
      let reader = new FileReader();
       if(fileRead[i].type == "image/tiff"){
          reader.onload = (event: any) => {
              var image = new Tiff({ buffer: event.target.result });
              var canvas = image.toCanvas();
              var img = convertCanvasToImage(canvas) ;
              resolve(img.src);
              }
              reader.readAsArrayBuffer(fileRead[i]);
          }else
          {
            reader.onload = (event: any) => {
            resolve(event.target.result);
          }
          reader.readAsDataURL(fileRead[i]);
        }
      });
      console.log(result);
      return result;
  }

  getImage(imageUrl: any){
    console.log("inside getImage"+imageUrl)
    return this.http.get("http://localhost:4000/images/sasiocr@gmail.com/birugali_0001.tif", { responseType: 'blob' });
  }



  async loadArray(serverImage: any) {
    console.log("inside load array");

    console.log("inside load array",serverImage);
    // const result = await new Promise((resolve) => {
    //   this.getImage(serverImage).subscribe(data => {
    //     console.log("dataType----" + data.type);
    //     console.log("data----" + data);
    //     let reader = new FileReader();
    //     //if else condition comes here
    //     if (data.type == "image/tiff") {
    //       reader.onload = (event: any) => {
    //         console.log("before tiff conversion",event.target.result);
    //         var image = new Tiff({ buffer: event.target.result });
    //         console.log("tiff before canvas",image);
    //         var canvas = image.toCanvas();
    //         var img = convertCanvasToImage(canvas);
    //         resolve(img.src);
    //       }
    //       reader.readAsArrayBuffer(data);
    //     }
    //     else {
    //       reader.onload = (event: any) => {
    //         console.log("data url=====================================" + event.target.result);
    //         resolve(event.target.result);
    //       }
    //       reader.readAsDataURL(data);
    //     }
    //   });
    // });
    // return result;

    let promise = new Promise((resolve, reject) => {
      var user = this.authService.userName;
      const queryParams = `?user=${user}`;
      this.http
        .get<{ message: string; json: any }>(
          this.IMAGE_BACKEND_URL + serverImage + queryParams).subscribe(responseData => {
          console.log("responseData.json",responseData.json);
          resolve(responseData.json);
        });
    });
    return promise;
  }

  updateXml(xmlString: any, fileName: any) {
    let xmlData: any;
    xmlData = {
      xml: xmlString,
      fileName: fileName,
      folderName : fileName.slice(0,-9)
    };
    this.http
      .put<{ message: string, name: string, completed: string }>(this.XML_BACKEND_URL + fileName, xmlData)
      .subscribe(response => {
        if(this.serverImages.length>0){
          for (let i = 0; i < this.serverImages.length; i++) {
            if (this.serverImages[i].fileName == response.name) {
              console.log("name" + this.serverImages[i].fileName);
              this.serverImages[i].completed = response.completed;
              console.log("completed" + this.serverImages[i].completed);
            }
          }
        }else{
          for (let i = 0; i < this.localImages.length; i++) {
            if (this.localImages[i].fileName == response.name) {
              console.log("name" + this.localImages[i].fileName);
              this.localImages[i].completed = response.completed;
              console.log("completed" + this.localImages[i].completed);
            }
          }
        }
        
      });
  }

  updateCorrectedXml(fileName:any) {
    console.log("Corrected xml "+ JSON.stringify(XmlModel.jsonObject));
    let jsonData : any;
    jsonData = {
      json:XmlModel.jsonObject,
      XmlfileName:fileName.slice(0,-3)+'xml',
      user : this.authService.userName
    };
    this.http
      .put<{ message: string }>(this.XML_BACKEND_URL, jsonData)
      .subscribe(response => {
        console.log("response message after correction "+response.message);
      });
  }

  openModalDialog(images: Images[]) {
    console.log("images count inside subscribe: " + images.length);
    this.btnImgArray.splice(0, this.btnImgArray.length);
    for (let i = 0; i < images.length; i++) {
      var btnImgEle = "<button  style=\"width: 100%; border: none;\" (click)=\"openThisImage()\" class=\"btnImg\" value=\"" + images[i].fileName + "\"  id=\"" + images[i]._id + "\">" + images[i].fileName + "</button>";
      console.log("btnImgEle: " + btnImgEle);
      this.btnImgArray.push(btnImgEle);
      this.btnImgArrayChange.emit(this.btnImgArray.slice());
    }
    console.log("images count inside btnImgArray: " + this.btnImgArray.length);
    $(".sideBody").empty();
    for (let i = 0; i < this.btnImgArray.length; i++) {
      $(".sideBody").append(this.btnImgArray[i]);

    }
    console.log("opening........")
 
  }

  async nextPage() {
    this.imgFileCount++;
    this.imageCountChange.emit(this.imgFileCount);
    this.serverImages = this.getImages();
    if (this.serverImages.length > 0) {
      this.localUrl = await this.loadArray(this.serverImages[this.imgFileCount].fileName);
      this.urlChanged.emit(this.localUrl.slice());
      this.fileName = this.serverImages[this.imgFileCount].fileName;
      this.fileNameChange.emit(this.fileName);
      console.log("inside Next this.imgFileCount after incrementing: " + this.imgFileCount);
      if (this.serverImages.length - 1 == this.imgFileCount) {
        this.nextImages = true;
        this.nextImageChange.emit(this.nextImages);
      }
    } else {
      this.localImages = this.getLocalImages();
      this.localUrl = this.localImages[this.imgFileCount].dataUrl;
      this.urlChanged.emit(this.localUrl.slice());
      this.fileName = this.localImages[this.imgFileCount].fileName;
      this.fileNameChange.emit(this.fileName);
      console.log("inside Next this.imgFileCount after incrementing: " + this.imgFileCount);
      if (this.localImages.length - 1 == this.imgFileCount) {
        this.nextImages = true;
        this.nextImageChange.emit(this.nextImages);
      }
    }
    if (this.imgFileCount > 0) {
      this.previousImages = false;
      this.previousImageChange.emit(this.previousImages);
    }
  }

  async previousPage() {
    this.serverImages = this.getImages();
    this.imgFileCount--;
    this.imageCountChange.emit(this.imgFileCount);
    if (this.serverImages.length > 0) {
      this.localUrl = await this.loadArray(this.serverImages[this.imgFileCount].fileName);
      this.urlChanged.emit(this.localUrl.slice());
      this.fileName = this.serverImages[this.imgFileCount].fileName;
      this.fileNameChange.emit(this.fileName);
      console.log("inside Next this.imgFileCount after decrementing: " + this.imgFileCount);
      if (this.serverImages.length - 1 > this.imgFileCount) {
        this.nextImages = false;
        this.nextImageChange.emit(this.nextImages);
      }
    } else {
      this.localImages = this.getLocalImages();
      this.localUrl = this.localImages[this.imgFileCount].dataUrl;
      this.urlChanged.emit(this.localUrl.slice());
      this.fileName = this.localImages[this.imgFileCount].fileName;
      this.fileNameChange.emit(this.fileName);
      console.log("inside Next this.imgFileCount after decrementing: " + this.imgFileCount);
      if (this.localImages.length - 1 > this.imgFileCount) {
        this.nextImages = false;
        this.nextImageChange.emit(this.nextImages);
      }
    }
    if (this.imgFileCount == 0) {
      this.previousImages = true;
      this.previousImageChange.emit(this.previousImages);
    }
  }

  async LastImage() {
    this.serverImages = this.getImages();
    if (this.serverImages.length > 0) {
      this.imgFileCount = this.serverImages.length - 1;
      this.imageCountChange.emit(this.imgFileCount);
      this.localUrl = await this.loadArray(this.serverImages[this.imgFileCount].fileName);
      this.urlChanged.emit(this.localUrl.slice());
      this.fileName = this.serverImages[this.imgFileCount].fileName;
      this.fileNameChange.emit(this.fileName);
      if (this.serverImages.length - 1 == this.imgFileCount) {
        this.nextImages = true;
        this.nextImageChange.emit(this.nextImages);
        this.previousImages = false;
        this.previousImageChange.emit(this.previousImages);
      }
    } else {
      this.localImages = this.getLocalImages();
      this.imgFileCount = this.localImages.length - 1;
      this.localUrl = this.localImages[this.imgFileCount].dataUrl;
      this.urlChanged.emit(this.localUrl.slice());
      this.fileName = this.localImages[this.imgFileCount].fileName;
      this.fileNameChange.emit(this.fileName);
      if (this.localImages.length - 1 == this.imgFileCount) {
        this.nextImages = true;
        this.nextImageChange.emit(this.nextImages);
        this.previousImages = false;
        this.previousImageChange.emit(this.previousImages);
      }
    }
  }

  async firstImage() {
    this.imgFileCount = 0;
    this.imageCountChange.emit(this.imgFileCount);
    this.serverImages = this.getImages();
    if (this.serverImages.length > 0) {
      this.localUrl = await this.loadArray(this.serverImages[this.imgFileCount].fileName);
      this.urlChanged.emit(this.localUrl.slice());
      this.fileName = this.serverImages[this.imgFileCount].fileName;
      this.fileNameChange.emit(this.fileName);
    } else {
      this.localImages = this.getLocalImages();
      this.localUrl = this.localImages[this.imgFileCount].dataUrl;
      this.urlChanged.emit(this.localUrl.slice());
      this.fileName = this.localImages[this.imgFileCount].fileName;
      this.fileNameChange.emit(this.fileName);
    }

    if (this.imgFileCount == 0) {
      this.previousImages = true;
      this.previousImageChange.emit(this.previousImages);
      this.nextImages = false;
      this.nextImageChange.emit(this.nextImages);
    }
  }

  onXml() {
    this.serverImages = this.getImages();
    if(this.serverImages.length>0){
      this.fileName = this.serverImages[this.imgFileCount].fileName;
      console.log("completion status: ",this.serverImages[this.imgFileCount].completed);
      if(this.serverImages[this.imgFileCount].completed =="Y") {
        this.getFileAsJson(this.fileName);
      }
    }else{
      this.localImages = this.getLocalImages();
      this.fileName = this.localImages[this.imgFileCount].fileName;
      console.log("completion status: ",this.localImages[this.imgFileCount].completed);
      if(this.localImages[this.imgFileCount].completed =="Y") {
      this.getFileAsJson(this.fileName);
    }
  }
}

  getFileAsJson(fileName : any) {
    console.log("file name in run ocr "+ fileName)
    var queryfileName = fileName.slice(0,-3) + 'xml';
    let userData : any;
    userData = {
      user : this.authService.userName
    }
      this.http
        .get<{ message: string; json:any }>(
          this.XML_BACKEND_URL + queryfileName).subscribe(responseData => {
          console.log("xml as json string "+JSON.stringify(responseData.json));
          XmlModel.jsonObject = responseData.json;
          this.retain(XmlModel.jsonObject);
        });
  }

  retain(jsonObj){
    let areaarray=[];
     // var jsonObj = JSON.parse(json);
     console.log("inside retain jsonObj: "+JSON.stringify(jsonObj));
     if(jsonObj['page'].block){
     var blocks = jsonObj['page'].block;
    //  console.log("block length " + blocks.length);

     for (var i = 0; i < blocks.length; i++) {
       var blockNumber = (blocks[i].BlockNumber);
       console.log("blockNumber" + blockNumber);
       console.log("blockRowStart from json "+blocks[i].rowStart);
       var blockRowStart = blocks[i].rowStart;
       var blockRowEnd = blocks[i].rowEnd;
       var blockColStart = blocks[i].colStart;
       var blockColEnd = blocks[i].colEnd;
       var x = (blockColEnd - blockColStart);
       console.log("x in retain "+x);
       console.log("percentage in retain "+retain.percentage);
       var blockwidth = (blockColEnd - blockColStart) * retain.percentage / 100;
       console.log("blockwidth" + blockwidth);
       var blockheight = (blockRowEnd - blockRowStart) * retain.percentage / 100;
       console.log("blockheight" + blockheight);
       var X = blockColStart * retain.percentage / 100;
       console.log("blockX" + X);
       var Y = blockRowStart * retain.percentage / 100;
       console.log("blockY" + Y);
       areaarray[i] = { "id": blockNumber, "x": X, "y": Y, "width": blockwidth, "height": blockheight };
     }
    }
     $('img#imgToRead').selectAreas('destroy');
     $('img#imgToRead').selectAreas({
      onChanged: debugQtyAreas,
      areas: areaarray
    });

    $('#nextImg').click(function () {
      console.log("onclick");
      $('#imgToRead').selectAreas('destroy');
    });
    $('#previousImg').click(function () {
      $('#imgToRead').selectAreas('destroy');
    });
    $('#firstImg').click(function () {
      $('#imgToRead').selectAreas('destroy');
    });
    $('#lastImg').click(function () {
      $('#imgToRead').selectAreas('destroy');
    });
 
    $('#buttonXml').click(function () {
      console.log("onclick");
      $('#imgToRead').selectAreas('destroy');
    });

    function debugQtyAreas(event, id, areas) {
      console.log(areas.length + " areas", arguments);
      this.displayarea = areas;
      console.log(areas.length + " this.displayarea", arguments);
    };
  }
}
function convertCanvasToImage(canvas) {
  console.log("in convert................");
  var image = new Image();
  image.src = canvas.toDataURL("image/png");
  console.log("image source"+image.src);
  return image;
}
