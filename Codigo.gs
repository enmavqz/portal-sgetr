//SGETR - BACKEND POO (CORRECCIÓN DE FILTRADO Y MAPEO)
var APP_ID = '7c988a45-e8a7-41a8-a60f-a98a17682faa';
var API_KEY = 'V2-UnGwA-C5RyG-0qoYp-NdoIX-QBr3Z-tyUKF-ZmZGd-NjSBd';
var ADMIN_EMAIL = 'josue.vasquez.privados20@clases.edu.sv';

function AppSheetService() {
  this.urlBase = "https://api.appsheet.com/api/v2/apps/" + APP_ID + "/tables/";
}

AppSheetService.prototype.consultar = function(tabla) {
  try {
    var url = this.urlBase + encodeURIComponent(tabla) + "/Action";
    var res = UrlFetchApp.fetch(url, {
      "method": "post",
      "headers": { "ApplicationAccessKey": API_KEY },
      "contentType": "application/json",
      "payload": JSON.stringify({ "Action": "Find", "Properties": {}, "Rows": [] }),
      "muteHttpExceptions": true
    });
    var data = JSON.parse(res.getContentText());
    return (data && Array.isArray(data)) ? data : [];
  } catch (e) {
    return [];
  }
};

function PortalSGETR() {
  this.service = new AppSheetService();
  this.emailUser = Session.getActiveUser().getEmail().toLowerCase();
}

PortalSGETR.prototype.cargarTodo = function(nieManual) {
  var self = this;
  
  // 1. Obtener Tablas Base
  var usuarios = self.service.consultar('USUARIOS');
  var estudiantesPool = self.service.consultar('ESTUDIANTES');
  
  // 2. Identificar Rol y NIE
  var uActual = usuarios.find(function(u) { return u.Correo && u.Correo.toLowerCase() === self.emailUser; });
  var isAdmin = (self.emailUser === ADMIN_EMAIL.toLowerCase() || (uActual && uActual.Rol_Usuario === "Administrador"));

  var nieFinal = null;

  if (isAdmin && nieManual) {
    nieFinal = String(nieManual).trim();
  } else if (uActual) {
    nieFinal = String(uActual.Nombre_Usuario).trim(); 
  } else {
    var estLog = estudiantesPool.find(function(e) { return e.Correo && e.Correo.toLowerCase() === self.emailUser; });
    if (estLog) nieFinal = String(estLog.NIE_Estudiante).trim();
  }

  if (!nieFinal && !isAdmin) throw new Error("Acceso denegado: Usuario no registrado.");

  // 3. Obtener Datos del Estudiante
  var perfil = estudiantesPool.find(function(e) { 
    return String(e.NIE_Estudiante).trim() === nieFinal; 
  }) || { Nombre_Estudiante: "Usuario: " + nieFinal, NIE_Estudiante: nieFinal };
  
  // Filtrado de Historial (Tabla: MÉRITOS DEMÉRITOS Y FALTAS, Columna: NIE)
  var historialRaw = self.service.consultar('MÉRITOS DEMÉRITOS Y FALTAS').filter(function(h) { 
    return String(h.NIE).trim() === nieFinal; 
  });
  
  // Filtrado de Redenciones (Tabla: REDENCIONES, Columna: NIE)
  var redenciones = self.service.consultar('REDENCIONES').filter(function(r) { 
    return String(r.NIE).trim() === nieFinal; 
  });

  // 4. Cruzar Redenciones con Deméritos
  var idsRedimidos = redenciones.map(function(r) { return String(r.ID_Demérito_Vinculado).trim(); });
  var historialProcesado = historialRaw.map(function(item) {
    if (item.Tipo === 'Demérito') {
      item.Redimido = idsRedimidos.indexOf(String(item['Row ID']).trim()) !== -1 ? 'Si' : 'No';
    }
    return item;
  });

  return {
    perfil: perfil,
    historial: historialProcesado,
    redenciones: redenciones,
    isAdmin: isAdmin
  };
};

function getDatosPortal(nie) {
  try {
    var portal = new PortalSGETR();
    return portal.cargarTodo(nie);
  } catch (err) {
    return { error: "Error", detalle: err.message };
  }
}

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('SGETR - Portal Privado')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
