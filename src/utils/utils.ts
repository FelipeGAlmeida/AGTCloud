export function parseDate(dataLable){
      var date: Date = new Date(dataLable);

      var aux = defineAux(date.getHours())
      var str_date = aux+date.getHours() //Hour

      aux = defineAux(date.getMinutes())
      str_date += ":" + aux+date.getMinutes() //Minutes

      aux = defineAux(date.getDate())
      str_date += " - " + aux+date.getDate() //Day

      aux = defineAux(date.getMonth()+1)
      str_date += "/" + aux+(date.getMonth()+1) //Month

      aux = defineAux(date.getFullYear()-2000)
      str_date += "/" + aux+date.getFullYear() //Year

      return str_date

    function defineAux(value) : string{
      if(value < 10) return "0"
      return ""
    }
}

export function filterDate(dataInfo, initDate, endDate) {
  console.log("** FILTER DATES **")
  var iDate = new Date(initDate)
  var eDate = new Date(endDate)
  console.log("I: "+iDate);
  console.log("E: "+eDate);

  var res = [0, dataInfo.length-1]
  console.log("RES: "+res)
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

  return res

  function getFormattedStringDate(date:String){
    //15:49 - 22/04/19
    //0123456789012345
    var hh = date.substring(0,2);
    var mn = date.substring(3,5);
    var dd = date.substring(8,10);
    var mm = date.substring(11,13);
    var aa = date.substring(14)

    return mm+"/"+dd+"/"+aa+" "+hh+":"+mn;
  }

  console.log("** ** ** ** **")
}