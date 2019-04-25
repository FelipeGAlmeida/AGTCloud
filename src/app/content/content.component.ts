import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { MatSelectModule } from '@angular/material/select';

import * as Utils from '../../utils/utils'

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.css']
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
  dataValues = [];
  dataLables = [];

  //Variables
  data: any;
  selectedDevice = "<Nenhum>"
  selectedSensor = "<Nenhum>"

  //Teste
  public jsondata = "{ \"data\": [ { \"_id\":\"5cac89e7abe340001e107287\", \"device\":\"5caca709c47ae3001e18384f\", \"sensor1\":\"12\", \"sensor2\":\"6\", \"sensor3\":\"45\", \"creation_date\": \"2019-04-09T13:56:08.418Z\" }, {\"_id\":\"5cac89e7abe340001e107287\", \"device\":\"5caca709c47ae3001e18384f\",\"sensor1\":\"20\", \"sensor2\":\"13\", \"sensor3\":\"40\",\"creation_date\": \"2019-04-09T14:56:08.418Z\" }, {\"_id\":\"5cac89e7abe340001e107287\",\"device\":\"5caca709c47ae3001e18384f\",\"sensor1\":\"25\",\"sensor2\":\"50\",\"sensor3\":\"10\",\"creation_date\": \"2019-04-09T15:56:08.418Z\"},{\"_id\":\"5cac89e7abe340001e107287\",\"device\":\"5caca709c47ae3001e18384f\",\"sensor1\":\"40\",\"sensor2\":\"27\",\"sensor3\":\"0\",\"creation_date\": \"2019-04-09T16:56:08.418Z\"},{\"_id\":\"5cac89e7abe340001e107287\",\"device\":\"5caca709c47ae3001e18384f\",\"sensor1\":\"28\",\"sensor2\":\"34\",\"sensor3\":\"15\",\"creation_date\": \"2019-04-09T17:56:08.418Z\"}]}"
  
  //Chart Data
  public chartLabels = [];
  public chartType;
  public chartLegend;
  public chartData = [];
  public chartColor = [];

  constructor(public http: HttpClient, public select: MatSelectModule) {
    var userId = "5cac89e7abe340001e107287";

    this.initChart();

    if(userId == undefined){ // if there isn't an user, login is required
      console.log("GO TO LOGIN");
      return;
    }

    this.getUserDevices(userId) //if there is an user, get his devices
  }

  getUserDevices(userId){
    this.devices = [];
    this.http.get<ServerResponse>(this.PROXY_URL+this.DEVICE_URL+userId).subscribe
    (data => {
      data.devices.forEach(device => {
        var loading:HTMLElement = (document.querySelectorAll('.loading-indicator'))[0] as HTMLElement
        loading.style.display = "none";
        this.devices.push(device);
      });
    });
  }

  getDeviceSensors(event){
    console.log(this.selectedDevice)
    this.sensors = [];
    this.sensorNames = [];
    var deviceId = undefined;
    this.devices.forEach(device => {
      if(device.local == this.selectedDevice) deviceId = device._id;
    });
    console.log("DEVICE ID:" + deviceId);
    var loading:HTMLElement = (document.querySelectorAll('.loading-indicator'))[0] as HTMLElement
    loading.style.display = "block";
    this.http.get<ServerResponse>(this.PROXY_URL+this.INFOS_URL+deviceId).subscribe
    (data => {
      data.infos.forEach(info => {
        this.sensors.push(info);
      });

      var keys = Object.keys(this.sensors[0]);
      keys.forEach(sensorName => {
      if(!this.sensorNames.includes(sensorName) && sensorName.includes("sns_"))
        this.sensorNames.push(sensorName.replace("sns_",""));
      });

      var loading:HTMLElement = (document.querySelectorAll('.loading-indicator'))[0] as HTMLElement
      loading.style.display = "none";
    });
  }

  prepareSensorData(event){
    this.sensors.forEach(sensor => {
      for(var key in sensor){
        if(key == ("sns_"+this.selectedSensor)){
          this.dataValues.push(sensor[key]);
          break;
        }
      }
      this.dataLables.push(Utils.parseDate(sensor['creation_date']))
    });

    const res = Utils.filterDate(this.dataLables, "04/24/2019 00:00", "04/24/2019 23:59")

    var values = [], lables = []
    for (let i = res[0]; i < res[1]; i++) {
      values.push(this.dataValues[i])
      lables.push(this.dataLables[i])      
    }

    this.dataValues = values;
    this.dataLables = lables;

    this.setChart()
  }

  initChart(){
    this.chartLabels = [];
    this.chartType = 'line';
    this.chartLegend = false;
    this.chartData = [{data: [], label: this.selectedSensor}];
  }

  setChart(){
    this.chartLabels = this.dataLables;
    this.chartType = 'line';
    this.chartLegend = false;
    this.chartData = [{data: this.dataValues, label: this.selectedSensor, borderColor: 'rgba(0, 99, 132, 0.8)', backgroundColor: 'rgba(0, 99, 132,0.2)', pointBorderColor: 'rgba(0, 99, 132, 0.8)', pointBackgroundColor: 'rgba(78, 180, 189, 1)', pointHoverBackgroundColor: '#00f', pointHoverBorderColor: 'rgba(255, 255, 255, 0.5)'}];
  }

  ngOnInit() {
  }

}
