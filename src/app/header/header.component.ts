import { Component, OnInit } from '@angular/core';

// Aqui decoramos a classe do component App Header
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})

export class HeaderComponent implements OnInit {

  userName = 'Engenharia AGT'

  // Aqui definimos o constructor da aplicacao
  constructor() { }

  ngOnInit() {
  }

  logout(){
    console.log("Saiu !")
  }

}
