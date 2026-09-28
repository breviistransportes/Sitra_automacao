import { criarPreenchedor } from './preenchedor.js';
import { criarPreenchedorCte } from './preenchedor-cte.js';

window.__cadastroMotorista = criarPreenchedor(window);
window.__cteManual = criarPreenchedorCte(window);
