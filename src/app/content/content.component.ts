import { ChartsModule } from 'ng2-charts';
import { SECONDS } from './../../utils/utils';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/components/common/messageservice';
import { Router } from '@angular/router';

import * as Utils from '../../utils/utils';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.css'],
  providers: [MessageService]
})

export class ContentComponent implements OnInit {

  //Constants
  PROXY_URL="https://cors-anywhere.herokuapp.com/";
  DEVICE_URL="http://agtkinder.dyndns.biz:3000/api/app/esp?user=";
  INFOS_URL="http://agtkinder.dyndns.biz:3000/api/app/deviceInfo?device=";

  //Lists
  devices = [];
  sensorNames = [];
  sensors = [];
  humidityValues = [];
  pressureValues = [];
  temperatureValues = [];
  selectedValues = [];
  dataLables = [];
  msgs = [];

  //Variables
  lastDataRec = ""
  dictionary: any
  user: string
  loading: HTMLElement
  realtime = false
  rtCount: number
  rtLoop: number
  rtLoop2: number
  selectedDevice: any
  selectedSensor: any
  eDate = new Date()
  iDate = new Date(this.eDate.getTime()-30*Utils.MINUTES)
  tMode = 30
  sMode = "mn"

  //Chart Data
  public chartLabels = [];
  public chartType;
  public chartLegend;
  public chartData = [];
  public chartColor = [];
  public options;

  constructor(public http: HttpClient, public msrv: MessageService, private router: Router) {
    this.initChart();
  }

  getUserDevices(userId){
    if(userId != undefined){
      this.user = userId
    }

    this.devices = [];
    Utils.startLoading(this.loading)

    this.http.get<ServerResponse>(this.PROXY_URL+this.DEVICE_URL+this.user).subscribe
    (data => {
      Utils.cancelLoading(this.loading, this.msgs, false, null, null)
      data.devices.forEach(device => {
        this.devices.push({label: device.local, value: device});
      });
    },
    err => {
      Utils.cancelLoading(this.loading, this.msgs, true, this.getUserDevices, this)
    });
  }

  getDeviceSensors(event){
    this.sensors = [];
    var deviceId = undefined;
    this.devices.forEach(device => {
      if(device.value.local == this.selectedDevice.local) deviceId = device.value._id;
    });
    
    if(event != null) Utils.startLoading(this.loading)
    this.http.get<ServerResponse>(this.PROXY_URL+this.INFOS_URL+deviceId).subscribe
    (data => {
      Utils.cancelLoading(this.loading, this.msgs, false, null, null)
      data.infos.forEach(info => {
        this.sensors.push(info)
      });
      Utils.setDataInterval(this.selectedDevice.interval/60)
      if(event != null){
        this.sensorNames = [];
        var keys = Object.keys(this.sensors[this.sensors.length-1]);
        keys.forEach(sensorName => {
          if(!this.sensorNames.includes(sensorName) && sensorName.includes("sns_")){
            this.sensorNames.push({label: sensorName.replace("sns_",""), value: sensorName});
          }
        });
      }

      if(event == null){
        this.prepareSensorData(null);
      } else {
        this.lastDataRec = ""
      }
    },
    err =>{
      Utils.cancelLoading(this.loading, this.msgs, true, this.getDeviceSensors, this)
    })
  }

  prepareSensorData(event){
    this.humidityValues = []
    this.pressureValues = []
    this.temperatureValues = []
    this.selectedValues = []
    this.dataLables = []
    var i = 0;
    this.sensors.forEach((sensor, index) => {

      var idx = index+1
      if(index >= this.sensors.length-1) idx = index
      var ret = Utils.parseDate(sensor.creation_date, this.sensors[idx].creation_date) // Converte e compara a distância entre as datas
      this.dataLables.push(ret.date) //Adiciona a data atual analisada
      this.selectedValues.push(0)

      var available_data = false
      for(var key in sensor){
        if(key == "sns_humidity"){
          if(this.selectedSensor.toString().includes("sns_humidity")){
            available_data = true
            this.humidityValues.push(sensor[key]); //Adiciona o sensor atual sendo atualizado
          }
        }
        if(key == "sns_atmosphericPressure"){
          if(this.selectedSensor.toString().includes("sns_atmosphericPressure")){
            available_data = true
            this.pressureValues.push(sensor[key]); //Adiciona o sensor atual sendo atualizado
          }
        }
        if(key == "sns_temperature"){
          if(this.selectedSensor.toString().includes("sns_temperature")){
            available_data = true
            this.temperatureValues.push(sensor[key]); //Adiciona o sensor atual sendo atualizado
          }
        }
      }

      if(!available_data){
        this.humidityValues.push("(Sem valor)")
        this.pressureValues.push("(Sem valor)")
        this.temperatureValues.push("(Sem valor)")
      }

      if(ret.gap != undefined && ret.gap.lables.length > 0){ //Adiciona o vetor diferença (gap) para preencher dados nao enviados

        for (let j = 0; j < ret.gap.lables.length; j++) {
          const lable = ret.gap.lables[j]
          const value = ret.gap.values[j]
          this.dataLables.splice(i+1+j,0,lable)
          this.selectedValues.push(0)
          if(this.selectedSensor.toString().includes("sns_humidity")) this.humidityValues.splice(i+1+j,0,value)
          if(this.selectedSensor.toString().includes("sns_atmosphericPressure")) this.pressureValues.splice(i+1+j,0,value)
          if(this.selectedSensor.toString().includes("sns_temperature")) this.temperatureValues.splice(i+1+j,0,value)
          i++
        }
      }
      i++
    });

    if(event != null) this.lastDataRec = ""
    this.setLastFilter(null)

    window.clearInterval(this.rtLoop2)
    this.rtCount = -1
  }

  setLastFilter(event){
    if(event != null) this.lastDataRec = ""
    if(!this.sMode) this.sMode = "mn"
    const ret = Utils.filterDate(this.dataLables, this.iDate, this.eDate, this.sMode, this.tMode)
    this.setFilteredChart(ret)
  }

  setCalendarFilter(event){
    if(event != null) this.lastDataRec = ""
    this.sMode = ""
    const ret = Utils.filterDate(this.dataLables, this.iDate, this.eDate, "range", 0)
    this.setFilteredChart(ret)
  }

  setFilteredChart(ret){
    this.iDate = ret.iDate
    this.eDate = ret.eDate

    const res = ret.res
    var h_values = [], p_values = [], t_values = [], lables = []
    for (let i = res[0]; i <= res[1]; i++) {
      h_values.push(this.humidityValues[i])
      p_values.push(this.pressureValues[i])
      t_values.push(this.temperatureValues[i])
      lables.push(this.dataLables[i])      
    }

    var values = []
    if(h_values.length > 0) values.push(h_values)
    if(p_values.length > 0) values.push(p_values)
    if(t_values.length > 0) values.push(t_values)

    if(this.dataLables[this.dataLables.length-1] != this.lastDataRec){
      this.setChart(values, lables)
      this.lastDataRec = this.dataLables[this.dataLables.length-1]
    }
    
  }

  initChart(){
    this.chartLabels = [];
    this.chartType = 'line';
    this.chartLegend = false;
    this.chartData = [{data: [], label: this.selectedSensor}];

    this.options = {
      scales: {
        yAxes: [{
          position: "left",
          type: 'linear',
          id: 'yl',
          ticks: {
            fontColor: "#FFF"
          }
        }, {
          position: "right",
          type: 'linear',
          id: 'yr',
          ticks: {
            fontColor: "#FFF"
          }
        }],
        xAxes: [{ 
          ticks: {
            fontColor: "#FFF"
          }
      }],
      }
    }
  }

  setChart(values, lables){
    this.chartLabels = lables;
    this.chartType = 'line';
    this.chartLegend = false;
    this.chartData = this.generateDataset(values)
  }

  generateDataset(values){
    let dataset = []
    let yAxesID = ''
    values.forEach((v,i) => {
      var color = ['rgba(0, 0, 255, 0.6)','rgba(0, 255, 0, 0.6)','rgba(255, 0, 0, 0.6)']//"#AA"+((1<<24)*Math.random()|0).toString(16)
      if(v[0]>100) yAxesID = 'yr'
      else yAxesID = 'yl'
      dataset.push({
        data: v,
        label: this.dictionary[this.sensorNames[i].value],
        borderColor: color[i],
        backgroundColor: color[i],
        pointBorderColor: color[i],
        pointBackgroundColor: color[i],
        pointHoverBackgroundColor: color[i],
        pointHoverBorderColor: color[i],
        fill: false,
        yAxisID: yAxesID
      })
    });
    return dataset
  }

  enableRT(){
    if(this.realtime){
      //pega a ultima hora que enviou > soma o intervalo > mantem atualizando (15s/1min) > repete
      this.rtCount = -1
      this.rtLoop = window.setInterval(() => {
        var currentTime = new Date().getTime()
        var lastUpdateTime = new Date(Utils.getFormattedStringDate(this.dataLables[this.dataLables.length-1])).getTime()
        lastUpdateTime = lastUpdateTime + Utils.DATA_INTERVAL*Utils.MINUTES

        if(this.rtCount*SECONDS >= Utils.MINUTES){
          window.clearInterval(this.rtLoop2)
          this.rtCount = -1;
        }

        if(currentTime >= lastUpdateTime){
          if(0 == this.rtCount++)
            this.rtLoop2 = window.setInterval(()=>{
              this.getDeviceSensors(null)
            }, (15*Utils.SECONDS))
        }

      }, Utils.SECONDS)
    }else{
      window.clearInterval(this.rtLoop2)
      window.clearInterval(this.rtLoop)
    }
  }

  ngOnInit() {
    var child = document.getElementById('child');
    child.style.right = child.clientWidth - child.offsetWidth + "px";
    this.loading = (document.querySelectorAll('.loading-indicator'))[0] as HTMLElement
    this.loading.style.display = "none"

    var userId = localStorage.getItem("UID")

    if(userId == undefined){ // if there isn't an user, login is required
      this.router.navigate(['']);
      return;
    }

    this.getUserDevices(userId) //if there is an user, get his devices

    this.dictionary = {
      "sns_humidity":"Umidade",
      "sns_temperature":"Temperatura",
      "sns_atmosphericPressure":"Pressão"
    }
  }

}
