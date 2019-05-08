import { SECONDS } from './../../utils/utils';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {MessageService} from 'primeng/components/common/messageservice';
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
  sensorValues = [];
  dataLables = [];
  msgs = [];
  modes: any

  //Variables
  lastDataRec = ""
  user: string
  loading: HTMLElement
  realtime = false
  rtCount: number
  rtLoop: number
  rtLoop2: number
  data: any
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

  constructor(public http: HttpClient, public msrv: MessageService, private router: Router) {
    this.initChart();
  }

  getUserDevices(userId){
    if(userId != undefined){
      this.user = userId
    }

    this.devices = [];
    Utils.startLoading(this.loading)
    //else this.msgs.push({key: 'toast', severity:'warn', summary: 'Info Message', detail:'PrimeNG rocks'});
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
    this.sensorValues = []
    this.dataLables = []
    var i = 0;
    this.sensors.forEach((sensor, index) => {

      var idx = index+1
      if(index >= this.sensors.length-1) idx = index
      var ret = Utils.parseDate(sensor.creation_date, this.sensors[idx].creation_date) // Converte e compara a distância entre as datas
      this.dataLables.push(ret.date) //Adiciona a data atual analisada

      var available_data = false
      for(var key in sensor){      
        if(key == this.selectedSensor){
          available_data = true
          this.sensorValues.push(sensor[key]); //Adiciona o sensor atual sendo atualizado
          break;
        }
      }
      if(!available_data) this.sensorValues.push("(Sem valor)")

      if(ret.gap != undefined && ret.gap.lables.length > 0){ //Adiciona o vetor diferença (gap) para preencher dados nao enviados

        for (let j = 0; j < ret.gap.lables.length; j++) {
          const lable = ret.gap.lables[j]
          const value = ret.gap.values[j]
          this.dataLables.splice(i+1+j,0,lable)
          this.sensorValues.splice(i+1+j,0,value)
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
    var values = [], lables = []
    for (let i = res[0]; i <= res[1]; i++) {
      values.push(this.sensorValues[i])
      lables.push(this.dataLables[i])      
    }

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
  }

  setChart(values, lables){
    this.chartLabels = lables;
    this.chartType = 'line';
    this.chartLegend = false;
    this.chartData = [{data: values, label: this.selectedSensor, borderColor: 'rgba(0, 99, 132, 0.8)', backgroundColor: 'rgba(0, 99, 132,0.2)', pointBorderColor: 'rgba(0, 99, 132, 0.8)', pointBackgroundColor: 'rgba(78, 180, 189, 1)', pointHoverBackgroundColor: '#00f', pointHoverBorderColor: 'rgba(255, 255, 255, 0.5)'}];
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
          console.log("RESETED !")
          window.clearInterval(this.rtLoop2)
          this.rtCount = -1;
        }

        console.log(currentTime+" > "+lastUpdateTime)
        if(currentTime >= lastUpdateTime){
          if(0 == this.rtCount++)
            this.rtLoop2 = window.setInterval(()=>{
              console.log("UPDATE !")
              this.getDeviceSensors(null)
            }, (15*Utils.SECONDS))
        }

        console.log(this.rtCount)
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
    this.modes = [
      {label: 'Minuto(s)', value: 'mn', icon: 'pi pi-clock'},
      {label: 'Hora(s)', value: 'hh', icon: 'pi pi-clock'},
      {label: 'Dia(s)', value: 'dd', icon: 'pi pi-calendar'},
      {label: 'Mês(s)', value: 'mm', icon: 'pi pi-calendar'},
      {label: 'Ano(s)', value: 'aa', icon: 'pi pi-calendar'}
  ];

    var userId = localStorage.getItem("UID")

    if(userId == undefined){ // if there isn't an user, login is required
      this.router.navigate(['']);
      return;
    }

    this.getUserDevices(userId) //if there is an user, get his devices
  }

}
