import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

// Aqui decoramos a classe do component App Header
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})

export class HeaderComponent implements OnInit {

  userName = ''

  // Aqui definimos o constructor da aplicacao
  constructor(private router: Router) { }

  ngOnInit() {
    this.userName = localStorage.getItem("EMAIL").split("@")[0]
  }

  logout(){
    localStorage.clear()
    this.router.navigate(['']);
  }

}
