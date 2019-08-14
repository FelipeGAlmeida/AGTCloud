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
  DEVICE_URL="http://agtkinder.dyndns.biz:3000/api/devices/esp?user=";
  INFOS_URL="http://agtkinder.dyndns.biz:3000/api/devices/deviceInfo?device=";
  INFOSPAGE_URL="http://agtkinder.dyndns.biz:3000/api/devices/deviceInfoPage?device=";
  INFOSDATE_URL="http://agtkinder.dyndns.biz:3000/api/devices/deviceInfoDate?device=";
  INFOSLAST_URL="http://agtkinder.dyndns.biz:3000/api/devices/deviceInfoLast?device=";

  //Lists
  devices = [];
  sensorNames = [];
  sensors = [];
  hallValues = [];
  humidityValues = [];
  pressureValues = [];
  temperatureValues = [];
  selectedValues = [];
  dataLables = [];
  msgs = [];

  //Variables
  page:number = 0
  pages:number = 0
  first_date: Date
  show_date: Date
  last_date: Date
  lastDateRec: Date
  dictionary: any
  user: string
  loading: HTMLElement
  realtime = false
  rtCount: number
  rtLoop: number
  rtUpdateLoop: number
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
    this.initChart(); //Inicializa o componente gráfico
  }

  prevPage(){ //Configura a página ou data para exibir os dados anteriores
    // if(this.page > 0){
    //   this.page--
    //   this.getDeviceSensorsPage(null)
    // }
    if(this.realtime) return
    if(this.show_date > this.first_date){ //Verifica se a data ainda está no range de disponibilidade
      this.show_date = new Date(this.show_date.getTime() - Utils.DAYS)
      this.show_date.setHours(0,0,0,0)
      this.getDeviceSensorsDate(true)
      return
    }
    console.info("NÃO HÁ DADOS MAIS ANTIGOS")
  }

  nextPage(){ //Configura a página ou data para exibir os dados anteriores
    // if(this.page < this.pages){
    //   this.page++
    //   this.getDeviceSensorsPage(null)
    // }
    if(this.realtime) return
    if(this.show_date < this.last_date){ //Verifica se a data ainda está no range de disponibilidade
      this.show_date = new Date(this.show_date.getTime() + Utils.DAYS)
      this.show_date.setHours(0,0,0,0)
      this.getDeviceSensorsDate(true)
      return
    }
    const now = new Date()
    now.setHours(0,0,0,0)
    if(this.last_date < now){
      this.show_date = now
      this.getDeviceSensorsDate(true)
      console.info("UM NOVO DIA DE UM NOVO TEMPO QUE COMEÇOU ! - "+this.show_date)
      return
    }
    console.info("NÃO HÁ DADOS MAIS RECENTES")
  }

  checkSensorNames(sensorName){
    return this.sensorNames.some(sn => sn.value === sensorName) //Verifica a existência de um sensor nos sensores de um device
  }

  getUserDevices(userId){ //Lista os Devices do usuário logado
    if(userId != undefined){
      this.user = userId //Define o usuário
    }

    this.devices = [];
    Utils.startLoading(this.loading)

    this.http.get<ServerResponse>(this.PROXY_URL+this.DEVICE_URL+this.user).subscribe //Efetua o GET na API
    (data => {
      Utils.cancelLoading(this.loading, this.msgs, false, null, null)
      data.devices.forEach(device => {
        this.devices.push({label: device.local, value: device}); //Adiciona os devices do usuário
      });
    },
    err => {
      Utils.cancelLoading(this.loading, this.msgs, true, this.getUserDevices, this)
    });
    if(this.show_date === undefined) this.show_date = new Date(new Date().toLocaleDateString("en-EN")) //Inicializa a data a se mostrar
  }

  getDeviceSensorsLast(load){//Lista o último dado do sensor enviado
    var deviceId = undefined;
    this.devices.forEach(device => {//Recupera o ID do device selecionado
      if(device.value.local == this.selectedDevice.local) deviceId = device.value._id;
    });
    if(load) Utils.startLoading(this.loading)
    this.http.get<ServerResponse>(this.PROXY_URL+this.INFOSLAST_URL+deviceId).subscribe //Efetua o GET na API
    (data => {
      Utils.cancelLoading(this.loading, this.msgs, false, null, null)
      
      const lastDateGot = new Date(data.infos.data[0].creation_date)
      const currentDate = new Date()

      if(this.show_date.getDate() != currentDate.getDate()){ //Se o dia virou, devemos iniciar o novo dia
        console.log("HOJE É UM NOVO DIA DE UM NOVO TEMPO QUE COMEÇOU - "+this.show_date.getDate()+" != "+currentDate.getDate())
        this.show_date = currentDate //Configura a data a mostrar como sendo a nova
        this.show_date.setHours(0,0,0,0)
        this.getDeviceSensorsDate(false)
        return
      }
      
      if(this.lastDateRec.getTime() == lastDateGot.getTime()){ //Se não houve atualização
          if(currentDate.getTime()-this.lastDateRec.getTime() > (Utils.DATA_INTERVAL*Utils.MINUTES+75*Utils.SECONDS)){ //Dado perdido, registra como vazio
          this.lastDateRec = new Date(this.lastDateRec.getTime() + Utils.DATA_INTERVAL * Utils.MINUTES)
          var model = data.infos.data[0] //Preenche um novo dado para inserção vazia
          model.creation_date = this.lastDateRec.toISOString()
          if(Object.keys(model).includes("sns_hall")) model.sns_hall = "--"
          if(Object.keys(model).includes("sns_humidity")) model.sns_humidity = "--"
          if(Object.keys(model).includes("sns_temperature")) model.sns_temperature = "--"
          if(Object.keys(model).includes("sns_atmosphericPressure")) model.sns_atmosphericPressure = "--"
          this.sensors.splice(0,0,model)
          console.info("DADO NÃO EMITIDO!")
          this.prepareSensorData(false)
          }
        return
      }

      this.lastDateRec = lastDateGot //Atualiza a última data recebida

      this.sensors.splice(0,0,data.infos.data[0]) //Adiciona o ultimo valor recebido
      this.prepareSensorData(false) //Prepara os dados novamente
    },
    err =>{
      Utils.cancelLoading(this.loading, this.msgs, true, this.getDeviceSensorsDate, this)
    })
  }

  getDeviceSensorsDate(load){ //Lista os dados de um sensor por dia
    this.sensors = [];
    var deviceId = undefined;
    this.devices.forEach(device => { //Recupera o ID do device selecionado
      if(device.value.local == this.selectedDevice.local) deviceId = device.value._id;
    });
    if(load) Utils.startLoading(this.loading)
    const ds = this.show_date.getTime()-(3*60*Utils.MINUTES) //Define a data inicial para requisição
    const de = ds+Utils.DAYS //Define a data final para requisição (1 dia depois)
    const param = "&ds="+ds+"&de="+de;
    this.http.get<ServerResponse>(this.PROXY_URL+this.INFOSDATE_URL+deviceId+param).subscribe //Efetua o GET na API
    (data => {
      Utils.cancelLoading(this.loading, this.msgs, false, null, null)
      if(data.infos[0].count[0] === undefined){
        console.info("NÃO EXISTEM DADOS PARA ESSE LOCAL!")
        return
      }
      this.first_date = new Date(new Date(data.infos[0].first[0].creation_date).toLocaleDateString("en-EN")) //Define a data do primeiro dado
      this.last_date = new Date(new Date(data.infos[0].last[0].creation_date).toLocaleDateString("en-EN")) //Define a data do último dado
      if(data.infos[0].data[0] === undefined){ //Caso não hajam dados recebidos
        if(this.show_date <= this.last_date && this.show_date >= this.first_date){
          console.info("NÃO EXISTEM DADOS PARA ESSE DIA!")
          this.sensors = []
          this.prepareSensorData(false)
          return;
        }
        this.show_date = this.last_date
        this.getDeviceSensorsDate(true) //Efetua novo GET com a data do último dado
        return;
      }
      data.infos[0].data.forEach(info => {
        this.sensors.push(info) //Adiciona os dados dos sensores na lista de dados
      });
      Utils.setDataInterval(this.selectedDevice.interval/60) //Configura o intervalo de atualização do sensor
      this.sensorNames = []
      this.selectedSensor = []
      var keys = Object.keys(this.sensors[0]);
      keys.forEach(sensorName => {
        if(!this.sensorNames.includes(sensorName) && sensorName.includes("sns_")){
          this.sensorNames.push({label: sensorName.replace("sns_",""), value: sensorName}); //Adiciona os sensores disponíveis
          this.selectedSensor.push(sensorName) //Inicializa com todos os sensores selecionados
        }
      });
      if(this.selectedSensor != undefined){
        this.prepareSensorData(load);
      }
    },
    err =>{
      Utils.cancelLoading(this.loading, this.msgs, true, this.getDeviceSensorsDate, this)
    })
  }

  // getDeviceSensorsPage(event){ //Lista os dados de um sensor paginando eles (DSTV)
  //   this.sensors = [];
  //   var deviceId = undefined;
  //   this.devices.forEach(device => {
  //     if(device.value.local == this.selectedDevice.local) deviceId = device.value._id;
  //   });
    
  //   if(event != null) Utils.startLoading(this.loading)
  //   const param = "&page="+this.page;
  //   this.http.get<ServerResponse>(this.PROXY_URL+this.INFOSPAGE_URL+deviceId+param).subscribe
  //   (data => {
  //     Utils.cancelLoading(this.loading, this.msgs, false, null, null)
  //     data.infos[0].data.forEach(info => {
  //       this.sensors.push(info)
  //     });
  //     this.pages = Math.floor(data.infos[0].count[0].device / 5)
  //     Utils.setDataInterval(this.selectedDevice.interval/60)
  //     if(event != null){
  //       this.sensorNames = [];
  //       var keys = Object.keys(this.sensors[this.sensors.length-1]);
  //       keys.forEach(sensorName => {
  //         if(!this.sensorNames.includes(sensorName) && sensorName.includes("sns_")){
  //           this.sensorNames.push({label: sensorName.replace("sns_",""), value: sensorName});
  //         }
  //       });
  //     }

  //     if(event == null){
  //       this.prepareSensorData(null);
  //     } else {
  //       this.selectedSensor = []
  //       this.lastDataRec = ""
  //     }
  //   },
  //   err =>{
  //     Utils.cancelLoading(this.loading, this.msgs, true, this.getDeviceSensorsDate, this)
  //   })
  // }

  // getDeviceSensors(event){ // Lista TODOS os dados de um determinado sensor (DSTV)
  //   this.sensors = [];
  //   var deviceId = undefined;
  //   this.devices.forEach(device => {
  //     if(device.value.local == this.selectedDevice.local) deviceId = device.value._id;
  //   });
    
  //   if(event != null) Utils.startLoading(this.loading)
  //   this.http.get<ServerResponse>(this.PROXY_URL+this.INFOS_URL+deviceId).subscribe
  //   (data => {
  //     Utils.cancelLoading(this.loading, this.msgs, false, null, null)
  //     data.infos.forEach(info => {
  //       this.sensors.push(info)
  //     });
  //     Utils.setDataInterval(this.selectedDevice.interval/60)
  //     if(event != null){
  //       this.sensorNames = [];
  //       var keys = Object.keys(this.sensors[this.sensors.length-1]);
  //       keys.forEach(sensorName => {
  //         if(!this.sensorNames.includes(sensorName) && sensorName.includes("sns_")){
  //           this.sensorNames.push({label: sensorName.replace("sns_",""), value: sensorName});
  //         }
  //       });
  //     }

  //     if(event == null){
  //       this.prepareSensorData(null);
  //     } else {
  //       this.lastDataRec = ""
  //     }
  //   },
  //   err =>{
  //     Utils.cancelLoading(this.loading, this.msgs, true, this.getDeviceSensors, this)
  //   })
  // }

  prepareSensorData(load){ //Prepara os dados do sensor, de acordo com o sensor selecionado
    this.hallValues = []
    this.humidityValues = []
    this.pressureValues = []
    this.temperatureValues = []
    this.selectedValues = []
    this.dataLables = []
    var i = 0;
    this.sensors.forEach((sensor, index) => {

      var idx = index+1
      if(index >= this.sensors.length-1) idx = index
      var ret = Utils.parseDate(this.sensors[idx].creation_date, sensor.creation_date) // Converte e compara a distância entre as datas
      this.dataLables.push(ret.date.substring(0,8)) //Adiciona a data atual analisada
      this.selectedValues.push(0)

      var available_data = false
      for(var key in sensor){
        if(key == "sns_hall"){
          if(this.selectedSensor.toString().includes("sns_hall")){
            available_data = true
            this.hallValues.push(sensor[key]); //Adiciona o sensor atual sendo atualizado
          }
        }
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
        this.hallValues.push("(Sem valor)")
        this.humidityValues.push("(Sem valor)")
        this.pressureValues.push("(Sem valor)")
        this.temperatureValues.push("(Sem valor)")
      }

      if(ret.gap != undefined && ret.gap.lables.length > 0){ //Adiciona o vetor diferença (gap) para preencher dados nao enviados

        for (let j = 0; j < ret.gap.lables.length; j++) {
          const lable = ret.gap.lables[j]
          const value = ret.gap.values[j]
          this.dataLables.splice(i+1+j,0,lable.substring(0,8))
          this.selectedValues.push(0)
          if(this.selectedSensor.toString().includes("sns_hall")) this.hallValues.splice(i+1+j,0,value)
          if(this.selectedSensor.toString().includes("sns_humidity")) this.humidityValues.splice(i+1+j,0,value)
          if(this.selectedSensor.toString().includes("sns_atmosphericPressure")) this.pressureValues.splice(i+1+j,0,value)
          if(this.selectedSensor.toString().includes("sns_temperature")) this.temperatureValues.splice(i+1+j,0,value)
          i++
        }
      }
      i++
    });

    //this.setLastFilter(null)
    this.setFilteredChart()

    window.clearInterval(this.rtUpdateLoop)
    this.rtCount = -1
  }

  // setLastFilter(event){
  //   if(event != null) this.lastDataRec = ""
  //   if(!this.sMode) this.sMode = "mn"
  //   const ret = Utils.filterDate(this.dataLables, this.iDate, this.eDate, this.sMode, this.tMode)
  //   this.setFilteredChart(ret)
  // }

  // setCalendarFilter(event){
  //   if(event != null) this.lastDataRec = ""
  //   this.sMode = ""
  //   const ret = Utils.filterDate(this.dataLables, this.iDate, this.eDate, "range", 0)
  //   this.setFilteredChart(ret)
  // }

  setFilteredChart(){
    // this.iDate = ret.iDate
    // this.eDate = ret.eDate

    // const res = ret.res
    //var hl_values = [], h_values = [], p_values = [], t_values = [], lables = []
    // for (let i = res[0]; i <= res[1]; i++) {
    //   if(this.hallValues[i] != undefined) hl_values.push(this.hallValues[i])
    //   if(this.humidityValues[i] != undefined) h_values.push(this.humidityValues[i])
    //   if(this.pressureValues[i] != undefined) p_values.push(this.pressureValues[i])
    //   if(this.temperatureValues[i] != undefined) t_values.push(this.temperatureValues[i])
    //   lables.push(this.dataLables[i])
    // }
    // var values = []
    // if(hl_values.length > 0) values.push(hl_values.reverse())
    // if(h_values.length > 0) values.push(h_values.reverse())
    // if(p_values.length > 0) values.push(p_values.reverse())
    // if(t_values.length > 0) values.push(t_values.reverse())
    //lables.reverse();
    
    if(this.dataLables[0] != this.lastDateRec){
      //this.setChart(hl_values.reverse(), h_values.reverse(), t_values.reverse(), p_values.reverse(), lables.reverse())
      if(this.sensors[0] !== undefined) this.lastDateRec = new Date(this.sensors[0].creation_date)
      this.setChart(this.hallValues.reverse(), this.humidityValues.reverse(), this.temperatureValues.reverse(), this.pressureValues.reverse(), this.dataLables.reverse())
    }
    
  }

  initChart(){

    this.chartLabels = [];
    this.chartType = 'line';
    this.chartLegend = false;
    this.chartData = [{data: [], label: this.selectedSensor}];

    this.options = { //Opções do gráfico
      responsive: true,
      maintainAspectRation: false,
      scales: {
        yAxes: [{ //Define as escalas verticais
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
        xAxes: [{ //Define as escalas horizontais
          ticks: {
            fontColor: "#FFF"
          }
      }],
      }
    }
  }

  setChart(hlv, hv, tv, pv, lables){
    this.chartLabels = lables;
    this.chartType = 'line';
    this.chartLegend = false;
    this.chartData = this.generateDataset(hlv, hv, tv, pv)
  }

  generateDataset(hlv, hv, tv, pv){
    var color = ['rgba(255, 255, 0, 0.6)',
                 'rgba(0, 0, 255, 0.6)',
                 'rgba(255, 0, 0, 0.6)',
                 'rgba(0, 255, 0, 0.6)']
    let dataset = []
    let yAxesID = ''

    if(hlv.length > 0){
      yAxesID = 'yl'
      pushSensor(hlv, 0, 'Magnético')
    }
    if(hv.length > 0){
      yAxesID = 'yl'
      pushSensor(hv, 1, 'Umidade')
    }
    if(tv.length > 0){
      yAxesID = 'yl'
      pushSensor(tv, 2, 'Temperatura')
    }
    if(pv.length > 0){
      yAxesID = 'yr'
      pushSensor(pv, 3, 'Pressão')
    }
    
    function pushSensor(v, pos, label){
      dataset.push({
        data: v,
        label: label,
        borderColor: color[pos],
        backgroundColor: color[pos],
        pointBorderColor: color[pos],
        pointBackgroundColor: color[pos],
        pointHoverBackgroundColor: color[pos],
        pointHoverBorderColor: color[pos],
        fill: false,
        yAxisID: yAxesID
      })
    }

    return dataset
  }

  enableRT(){
    if(this.realtime){

      this.show_date = new Date()
      this.show_date.setHours(0,0,0,0)
      this.getDeviceSensorsDate(false)

      this.rtLoop = window.setInterval(() => {
        var currentTime = new Date().getTime() //Pega a hora atual
        var lastUpdateTime = this.lastDateRec.getTime()+ Utils.DATA_INTERVAL*Utils.MINUTES //Pega hora da última atualização e soma o intervalo
        
        if(currentTime > lastUpdateTime){ //Caso dê a hora de atualizar
            this.getDeviceSensorsLast(false) //Tenta atualizar até que tenha sucesso
        }
      }, 2 * Utils.SECONDS)
      // //pega a ultima hora que enviou > soma o intervalo > mantem atualizando (15s/1min) > repete
      // this.rtCount = -1 //Contador do tempo para repetição
      // this.rtLoop = window.setInterval(() => {
      //   var currentTime = new Date().getTime() //Pega a hora atual
      //   var lastUpdateTime = this.lastDataRec.getTime() //Pega hora da última atualização
      //   lastUpdateTime = lastUpdateTime + Utils.DATA_INTERVAL*Utils.MINUTES //Soma o intervalo

      //   if(this.rtCount*SECONDS >= Utils.MINUTES){ //Após 1 minuto tentando atualizar, limpa o timer de atualização
      //     window.clearInterval(this.rtUpdateLoop)
      //     this.rtCount = -1;
      //   }

      //   if(currentTime >= lastUpdateTime){ //Caso a hora atual seja superior a hora da última atualização
      //     if(0 == this.rtCount++) //Se o contador estiver zerado
      //       this.rtUpdateLoop = window.setInterval(()=>{
      //         this.getDeviceSensorsLast(null) //Tenta atualizar durante 1 minuto a cada 15s
      //       }, (15*Utils.SECONDS))
      //   }

      // }, Utils.SECONDS)
    }else{
      //window.clearInterval(this.rtUpdateLoop)
      window.clearInterval(this.rtLoop)
    }
  }

  ngOnInit() {   
    var child = document.getElementById('child');
    child.style.right = child.clientWidth - child.offsetWidth + "px"; //Remove o scroll da lista de dados (+css)
    this.loading = (document.querySelectorAll('.loading-indicator'))[0] as HTMLElement
    this.loading.style.display = "none"

    var userId = localStorage.getItem("UID") //Tenta recuperar o Id do usuário

    if(userId == undefined){ //if there isn't an user, login is required
      this.router.navigate(['']);
      return;
    }

    this.getUserDevices(userId) //if there is an user, get his devices

    this.dictionary = { //Dicionário para mapeamento dos sensores em nomes legiveis
      "sns_hall":"Magnético",
      "sns_humidity":"Umidade",
      "sns_temperature":"Temperatura",
      "sns_atmosphericPressure":"Pressão"
    }
  }

}
