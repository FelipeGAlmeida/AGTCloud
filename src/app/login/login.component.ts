import { MessageModule } from 'primeng/message';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/components/common/messageservice';
import { Router } from '@angular/router';
import sha256 from 'crypto-js/sha256';

import * as Utils from '../../utils/utils';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  providers: [MessageService]
})

export class LoginComponent implements OnInit {
    //Constants
    PROXY_URL="https://cors-anywhere.herokuapp.com/";
    LOGIN_URL="http://agtkinder.dyndns.biz:3000/api/devices/login";

    //Listas
    msgs = [];

    //Variáveis
    email: string
    password: string
    loading: HTMLElement

  constructor(public http: HttpClient, public msrv: MessageService, private router: Router) { }

   login(){
     if(this.email == undefined || this.password == undefined){
      this.msgs[0] = {severity:'error', summary:'Campos vazios detectados.', detail:'Entre com o e-mail e a senha para autenticar-se.'}
      window.setTimeout(() => {
        this.msgs.pop();
      }, 5*Utils.SECONDS)
      return
     }

    var hashed_pass:String = sha256(this.password).toString()

    Utils.startLoading(this.loading)
    this.http.post<ServerResponse>(this.PROXY_URL+this.LOGIN_URL, {
      email: this.email,
      password: hashed_pass
    }).subscribe
    (data => {
      Utils.cancelLoginLoading(this.loading, this.msgs, false)
      if(data.user.id != undefined){
        localStorage.setItem("UID", data.user.id.toString())
        localStorage.setItem("EMAIL", data.user.email)
        this.router.navigate(['dashboard']);
      }
    },
    err => {
      Utils.cancelLoginLoading(this.loading, this.msgs, err)
      console.log(err.error.message)
    });
  }

  ngOnInit() {
    this.loading = (document.querySelectorAll('.loading-indicator'))[0] as HTMLElement
    this.loading.style.display = "none"
  }

}
