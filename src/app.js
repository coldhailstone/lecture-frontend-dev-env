import './app.scss';
import nyancat from './nyancat.jpeg';

document.addEventListener('DOMContentLoaded', () => {
    document.body.innerHTML = `<img src="${nyancat}" />`;
});

console.log(process.env.NODE_ENV);
console.log(TWO);
console.log(THREE);
console.log(api.domain);
