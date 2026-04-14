var SGETR_UI = function() {
  this.datos = null;
  this.modal = null;
};

SGETR_UI.prototype.init = function(nieManual) {
  var self = this;
  this.modal = new bootstrap.Modal(document.getElementById('modalCarnet'));
  var WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwTMqsULSJewdFuQeUBljmLUh3PO6RYFoqS-l8m2jeT9m_TMuFxaE97hqwbqQ9fQH33/exec";
  var urlFetch = WEB_APP_URL + "?action=getDatos";
  if(nieManual) urlFetch += "&nie=" + nieManual;
fetch(urlFetch)
    .then(response => response.json())
    .then(res => {
      document.getElementById('loader').classList.add('hidden');
      if (res.error) return alert("Aviso: " + res.detalle);
      
      self.datos = res;
      self.render();
    })
    .catch(err => {
      console.error("Error de conexión:", err);
      alert("Error al conectar con el servidor SGETR. Verifica la configuración de la Web App.");
      document.getElementById('loader').classList.add('hidden');
    });
    .getDatosPortal();
};

SGETR_UI.prototype.render = function() {
  var p = this.datos.perfil || {};
  document.getElementById('uNombre').innerText = p.Nombre_Estudiante || "Auditor / Admin";
  document.getElementById('uNie').innerText = "NIE: " + (p.NIE_Estudiante || "---");
  var fotoDefault = (p.Genero_Estudiante === "Femenino") 
    ? "https://cdn-icons-png.flaticon.com/512/6997/6997662.png" 
    : "https://cdn-icons-png.flaticon.com/512/6833/6833905.png";
  document.getElementById('uFoto').src = p.Foto_Estudiante || fotoDefault;
  if(this.datos.isAdmin) document.getElementById('adminArea').classList.remove('hidden');

  var campos = [{l:'Grado', v:p.Grado_Estudiante}, {l:'Sección', v:p.Código_Estudiante}, {l:'Correo', v:p.Correo}];
  document.getElementById('perfilGrid').innerHTML = campos.map(function(c) {
    return '<div class="col-6 col-md-4"><div class="p-3 bg-white rounded-3 shadow-sm border h-100"><label class="small text-muted d-block text-uppercase" style="font-size:0.65rem;">' + c.l + '</label><span class="fw-bold small">' + (c.v || '---') + '</span></div></div>';
  }).join('');
};

SGETR_UI.prototype.showView = function(v, btn) {
  ['dashboard', 'perfil', 'historial'].forEach(function(id) { 
    document.getElementById('view-'+id).classList.add('hidden'); 
  });
  document.getElementById('view-' + v).classList.remove('hidden');
  if(btn) {
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
  }
  if (window.innerWidth <= 992) {
    var side = document.getElementById('sidebar');
    if(side.classList.contains('active')) this.toggleSidebar();
  }
};

SGETR_UI.prototype.toggleSidebar = function() {
  var side = document.getElementById('sidebar');
  var over = document.getElementById('sidebar-overlay');
  if (!side.classList.contains('active')) {
    side.classList.add('active');
    over.style.display = 'block';
    setTimeout(function() { over.style.opacity = '1'; }, 10);
  } else {
    side.classList.remove('active');
    over.style.opacity = '0';
    setTimeout(function() { over.style.display = 'none'; }, 300);
  }
};

SGETR_UI.prototype.verHistorial = function(tipo) {
  this.showView('historial');
  document.getElementById('histTitulo').innerText = "Historial de " + tipo;
  var items = (tipo === 'Redención') ? this.datos.redenciones : this.datos.historial.filter(function(h) { return h.Tipo === tipo; });
  var container = document.getElementById('histContent');
  if (items.length === 0) {
    container.innerHTML = '<div class="text-center p-5"><i class="fas fa-folder-open fa-3x text-light mb-3"></i><p class="text-muted">No se encontraron registros de ' + tipo + '</p></div>';
    return;
  }
  container.innerHTML = items.map(function(h) {
    var txt = (h.Falta || h.Demérito || h.Mérito || h.Tipo_Redención || "");
    var grav = "";
    if(txt.includes("FMG:")) grav = "FMG";
    else if(txt.includes("FG:")) grav = "FG";
    else if(txt.includes("FL:")) grav = "FL";
    else if(tipo === 'Mérito') grav = "MERITO";
    else if(tipo === 'Redención') grav = "REDENCION";

    return '<div class="timeline-item ' + grav + '">' +
           '<p class="small text-muted mb-1"><i class="far fa-calendar-alt me-1"></i>' + h.Fecha + '</p>' +
           '<h6 class="fw-bold mb-2">' + txt + '</h6>' +
           (h.Descripción ? '<div class="small text-muted p-2 bg-light rounded border mb-2">' + h.Descripción + '</div>' : '') +
           (tipo === 'Demérito' ? '<span class="badge ' + (h.Redimido === 'Si' ? 'bg-success' : 'bg-light text-muted border') + '">' + (h.Redimido === 'Si' ? 'Con Redención' : 'Pendiente') + '</span>' : '') +
           '</div>';
  }).join('');
};

SGETR_UI.prototype.auditar = function() {
  var self = this;
  var nie = document.getElementById('nieSearch').value;
  if(!nie) return alert("Por favor ingrese un NIE");
  document.getElementById('loader').classList.remove('hidden');
  google.script.run.withSuccessHandler(function(res) {
    document.getElementById('loader').classList.add('hidden');
    if(res.error && !res.isAdmin) return alert("Error: " + res.detalle);
    self.datos = res;
    self.render();
    self.showView('dashboard');
    document.getElementById('nieSearch').value = "";
  }).getDatosPortal(nie);
};

SGETR_UI.prototype.abrirCarnet = function() {
  var side = document.getElementById('sidebar');
  if(window.innerWidth <= 992 && side.classList.contains('active')) this.toggleSidebar();
  var p = this.datos.perfil || {};
  document.getElementById('idNombre').innerText = p.Nombre_Estudiante || "USUARIO";
  document.getElementById('idNieTxt').innerText = "NIE: " + (p.NIE_Estudiante || "---");
  document.getElementById('idGrado').innerText = (p.Grado_Estudiante || "") + " - " + (p.Código_Estudiante || "");
  document.getElementById('idQr').src = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + (p.NIE_Estudiante || "000");
  this.modal.show();
};

SGETR_UI.prototype.descargar = function() {
  html2canvas(document.getElementById('carnetArea'), { scale: 3, useCORS: true }).then(function(canvas) {
    var link = document.createElement('a');
    link.download = 'Carnet_Digital_SGETR.png';
    link.href = canvas.toDataURL();
    link.click();
  });
};

SGETR_UI.prototype.logout = function() {
  window.top.location.href = "https://accounts.google.com/Logout?continue=https://appengine.google.com/_ah/logout";
};

var ui = new SGETR_UI();
window.onload = function() { ui.init(); };
