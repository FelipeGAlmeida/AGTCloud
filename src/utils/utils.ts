var LOADING:number
var CONN_INTERVAL: number

export var SECONDS: number = 1000
export var MINUTES: number = 60*SECONDS
export var DATA_INTERVAL: number

export function parseDate(dataLable0, dataLable1){ //Returns a string of an formatted date
      var date0: Date = new Date(dataLable0);
      var date1: Date = new Date(dataLable1);

      if(date1 != null)
        var ret = verifyVacuum(date0, date1)

      var aux = defineAux(date0.getHours())
      var str_date = aux+date0.getHours() //Hour

      aux = defineAux(date0.getMinutes())
      str_date += ":" + aux+date0.getMinutes() //Minutes

      aux = defineAux(date0.getSeconds())
      str_date += ":" + aux+date0.getSeconds() // Seconds

      aux = defineAux(date0.getDate())
      str_date += " - " + aux+date0.getDate() //Day

      aux = defineAux(date0.getMonth()+1)
      str_date += "/" + aux+(date0.getMonth()+1) //Month

      aux = defineAux(date0.getFullYear()-2000)
      str_date += "/" + aux+(date0.getFullYear()-2000) //Year

      return { date: str_date,
               gap: ret
             } 

    function defineAux(value) : string{
      if(value < 10) return "0"
      return ""
    }
}

export function verifyVacuum(date0, date1){
  const delta = date1.getTime() - date0.getTime()
  if(delta > (DATA_INTERVAL+1)*MINUTES){
    var gap = Math.floor((delta - (DATA_INTERVAL*MINUTES)) / (DATA_INTERVAL*MINUTES))

    var lables = [], values = []
    for (let i = 0; i < gap; i++) {
      lables.push(parseDate(new Date(date0.getTime() + (i+1)*DATA_INTERVAL*MINUTES).toString(), null).date)
      values.push("(Sem valor)")
    }
    
    return {
      values: values,
      lables: lables
    }
  }
}

export function filterDate(dataInfo, iDate, eDate, mode, time) {
  
  var res = [0, dataInfo.length-1]
  var iDate, eDate;
  switch(mode){
    case "mn":
      eDate = new Date()
      iDate = new Date(eDate.getTime()-MINUTES*time) //ms -> s -> mn * t
    break
    case "hh":
      eDate = new Date()
      iDate = new Date(eDate.getTime()-MINUTES*60*time) //ms -> s -> mn -> h * t
    break
    case "dd":
      eDate = new Date()
      iDate = new Date(eDate.getTime()-MINUTES*60*24*time) //ms -> s -> mn -> h -> d * t
    break
    case "mm":
      eDate = new Date()
      iDate = new Date(eDate.getTime()-MINUTES*60*24*30*time) //ms -> s -> mn -> h -> d -> m * t
    break
    case "aa":
      eDate = new Date()
      iDate = new Date(eDate.getTime()-MINUTES*60*24*30*12*time) //ms -> s -> mn -> h -> d -> m -> a * t
    break
    default:
      eDate = new Date(eDate)
      iDate = new Date(iDate)
  }

  return getDateIndexes();

  function getDateIndexes(){
    var iCtrl = false, eCtrl = false;
    for (let i = 0; i < dataInfo.length; i++) {
      const date = dataInfo[i];
      var cDate = new Date(getFormattedStringDate(date))
      if(cDate.getTime() > iDate.getTime() && !iCtrl){
        res[0] = i;
        iCtrl = true;
      }
      if(cDate.getTime() > eDate.getTime() && !eCtrl){
        res[1]= i-1;
        eCtrl = true;
      }
    }

    if(mode != "range" && !iCtrl && !eCtrl) {
      res[0] = res[1];
    }

    return {res, iDate, eDate}
  }
}

export function getFormattedStringDate(date:String){ //returns a string for Date() contructor
  if(date.length <= 3) return "_"
  var hh = date.substring(0,2)
  var mn = date.substring(3,5)
  var ss = date.substring(6,8)
  var dd = date.substring(11,13)
  var mm = date.substring(14,16)
  var aa = date.substring(17)

  return mm+"/"+dd+"/"+aa+" "+hh+":"+mn+":"+ss
}

export function startLoading(loading:HTMLElement){
  loading.style.display = "block"
}

export function cancelLoading(loading:HTMLElement, msgs, err, callback, self){
  window.clearTimeout(LOADING)
  loading.style.display = "none"

  if(err){
    msgs.pop();
    clearInterval(CONN_INTERVAL)
    msgs[0] = {severity:'error', summary:'Não foi possível buscar os dados no servidor.', detail:'Vamos tentar uma nova conexão em 5 segundos.'}
    var time = 4
    CONN_INTERVAL = window.setInterval( () => {
      if(time > 0){
        msgs[0] = {severity:'error', summary:'Não foi possível buscar os dados no servidor.', detail:'Vamos tentar uma nova conexão em '+time+' segundos.'}
      }else if(time == 0){
        msgs[0] = {severity:'info', summary:'Tentando buscar os dados novamente.', detail:''}
        callback.call(self)
      }else if(time == -3){
        msgs.pop()
        clearInterval(CONN_INTERVAL)
      }
      time = time - 1
    }, SECONDS)
  }
}

export function cancelLoginLoading(loading:HTMLElement, msgs, err){
  window.clearTimeout(LOADING)
  loading.style.display = "none"

  if(err){
    msgs.pop();
    clearInterval(CONN_INTERVAL)

    var detail_msg = 'Verifique sua conexão e tente novamente.'

    var err_type: String = err.error.message
    if(err_type.includes('User')){
      detail_msg = "O e-mail fornecido não está cadastrado no sistema."
    }
    else if(err_type.includes('Password')){
      detail_msg = "A senha fornecida está incorreta"
    }

    msgs[0] = {severity:'error', summary:'Não foi possível autenticar-se no servidor.', detail: detail_msg}
    CONN_INTERVAL = window.setTimeout( () => {
      msgs.pop()
    }, 5*SECONDS)
  }
}

export function setDataInterval(data_interval){
  DATA_INTERVAL = data_interval
}