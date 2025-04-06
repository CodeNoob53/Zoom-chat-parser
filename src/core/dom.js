// DOM-елементи - отримуємо тільки елементи, які присутні в DOM
export const elements = {
  // Елементи вкладки "Парсер"
  chatInput: document.getElementById("chatInput"),
  fileInput: document.getElementById("fileInput"),
  parseBtn: document.getElementById("parseBtn"),
  useKeywordChk: document.getElementById("useKeywordChk"),
  keywordInput: document.getElementById("keywordInput"),
  dbStatus: document.getElementById("dbStatus"),
  
  // Елементи вкладки "Учасники"
  participantsList: document.getElementById("participantsList"),
  countNamesSpan: document.getElementById("countNames"),
  sortById: document.getElementById("sortById") || null,
  sortBySurname: document.getElementById("sortBySurname") || null,
  sortByFirstname: document.getElementById("sortByFirstname") || null,
  sortByNickname: document.getElementById("sortByNickname") || null,
  saveBtn: document.getElementById("saveBtn") || null,
  saveCsvBtn: document.getElementById("saveCsvBtn") || null,
  saveJsonBtn: document.getElementById("saveJsonBtn") || null,
  
  // Елементи вкладки "База"
  databaseList: document.getElementById("databaseList") || null,
  sortDbById: document.getElementById("sortDbById") || null,
  sortDbBySurname: document.getElementById("sortDbBySurname") || null,
  sortDbByFirstname: document.getElementById("sortDbByFirstname") || null,
  sortDbByNicknames: document.getElementById("sortDbByNicknames") || null,
  dbFormId: document.getElementById("dbFormId") || null,
  dbFormSurname: document.getElementById("dbFormSurname") || null,
  dbFormFirstname: document.getElementById("dbFormFirstname") || null,
  dbFormNickname1: document.getElementById("dbFormNickname1") || null,
  dbFormNickname2: document.getElementById("dbFormNickname2") || null,
  dbFormClearBtn: document.getElementById("dbFormClearBtn") || null,
  dbFormSaveBtn: document.getElementById("dbFormSaveBtn") || null,
  dbAddBtn: document.getElementById("dbAddBtn") || null,
  dbImportBtn: document.getElementById("dbImportBtn") || null,
  dbImportFile: document.getElementById("dbImportFile") || null,
  dbExportCsvBtn: document.getElementById("dbExportCsvBtn") || null,
  dbExportJsonBtn: document.getElementById("dbExportJsonBtn") || null,
  dbSearchInput: document.getElementById("dbSearchInput") || null,
  dbSearchBtn: document.getElementById("dbSearchBtn") || null,
  
  // Загальні елементи
  notification: document.getElementById("notification")
};