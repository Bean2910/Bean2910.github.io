# How it works

Deep mode: what the site's JavaScript is made of and what its start page did while we watched.

## Its JavaScript

Analysed 5 script(s) from https://didenchua.online/?phong=chua-1: 3 module(s), 19 endpoint(s), 0 route(s).

Evidence ev_19fc5c42f2e7478b6796bb107816a9f6413f806124c383cd9d4353717382edc3.

```json
{
  "api_operations": [],
  "app_kind": "unknown",
  "bundlers": [],
  "edges": [
    {
      "from": "event:challenges.cloudflare.com/turnstile/v0/api.js#D:click",
      "kind": "handled-by",
      "to": "fn:challenges.cloudflare.com/turnstile/v0/api.js#D.addEventListener(click)@2"
    },
    {
      "from": "event:challenges.cloudflare.com/turnstile/v0/api.js#D:keydown",
      "kind": "handled-by",
      "to": "fn:challenges.cloudflare.com/turnstile/v0/api.js#D.addEventListener(keydown)@2"
    },
    {
      "from": "event:challenges.cloudflare.com/turnstile/v0/api.js#I:click",
      "kind": "handled-by",
      "to": "fn:challenges.cloudflare.com/turnstile/v0/api.js#U@2"
    },
    {
      "from": "event:challenges.cloudflare.com/turnstile/v0/api.js#e:error",
      "kind": "handled-by",
      "to": "fn:challenges.cloudflare.com/turnstile/v0/api.js#e.onerror@2"
    },
    {
      "from": "event:challenges.cloudflare.com/turnstile/v0/api.js#window:DOMContentLoaded",
      "kind": "handled-by",
      "to": "fn:challenges.cloudflare.com/turnstile/v0/api.js#Mi@2"
    },
    {
      "from": "event:challenges.cloudflare.com/turnstile/v0/api.js#window:keydown",
      "kind": "handled-by",
      "to": "fn:challenges.cloudflare.com/turnstile/v0/api.js#i@2"
    },
    {
      "from": "event:challenges.cloudflare.com/turnstile/v0/api.js#window:message",
      "kind": "handled-by",
      "to": "fn:challenges.cloudflare.com/turnstile/v0/api.js#I@2"
    },
    {
      "from": "event:challenges.cloudflare.com/turnstile/v0/api.js#window:mousemove",
      "kind": "handled-by",
      "to": "fn:challenges.cloudflare.com/turnstile/v0/api.js#i@2"
    },
    {
      "from": "event:challenges.cloudflare.com/turnstile/v0/api.js#window:resize",
      "kind": "handled-by",
      "to": "fn:challenges.cloudflare.com/turnstile/v0/api.js#j@2"
    },
    {
      "from": "event:challenges.cloudflare.com/turnstile/v0/api.js#window:touchstart",
      "kind": "handled-by",
      "to": "fn:challenges.cloudflare.com/turnstile/v0/api.js#i@2"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#E:dispose",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#T@3575"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#P:dispose",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#me@3828"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#R:dispose",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#k@5"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#Sc.querySelector(button):click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#zo@4662"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#a:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#a.addEventListener(click)@4253"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#a:dispose",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#s@5"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#a:input",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#a.addEventListener(input)@4337"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#a:input",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#r@3575"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#a:keydown",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#a.addEventListener(keydown)@4625"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#at:dispose",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#ut@3804"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#b:dispose",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#m@3575"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#c:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#c.onclick@3876"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#c:dispose",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#r@3575"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#d:error",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#d.addEventListener(error)@4233"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#d:load",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#u@3575"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#document:visibilitychange",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#document.addEventListener(visibilitychange)@3900"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#e.querySelector(button):click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#e.querySelector(button).addEventListener(click)@4662"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#e:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#e.addEventListener(click)@4289"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#e:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#e.onclick@3876"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#e:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#t@5"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#e:error",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#e.onerror@3828"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#e:input",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#e.addEventListener(input)@4564"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#e:load",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#e.onload@3900"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#e:pointercancel",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#i@5"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#e:pointerdown",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#e.addEventListener(pointerdown)@4465"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#e:pointermove",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#e.addEventListener(pointermove)@4465"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#e:pointerup",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#i@5"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#f:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#f.addEventListener(click)@4367"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#h:keydown",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#h.addEventListener(keydown)@4152"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#i(.lib-back):click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#i(.lib-back).addEventListener(click)@4274"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#i(.lib-close):click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#i(.lib-close).addEventListener(click)@4274"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#i:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#i.addEventListener(click)@3847"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#i:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#i.onclick@3876"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#i:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#o@5"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#i:close",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#i.onclose@3900"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#i:input",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#i.addEventListener(input)@4337"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#i:keydown",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#i.addEventListener(keydown)@4337"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#i:message",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#i.onmessage@3900"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#i:open",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#i.onopen@3900"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#k:dispose",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#S@3575"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#l:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#h@3575"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#o(.lib-back):click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#o(.lib-back).addEventListener(click)@4253"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#o(.lib-close):click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#o(.lib-close).addEventListener(click)@4253"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#o:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#o.addEventListener(click)@3900"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#o:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#o.onclick@3876"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#o:input",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#o.addEventListener(input)@4337"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#o:pointercancel",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#a@5"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#o:pointerdown",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#o.addEventListener(pointerdown)@4180"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#o:pointermove",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#o.addEventListener(pointermove)@4180"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#o:pointerup",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#a@5"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#r:change",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#r.addEventListener(change)@4337"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#r:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#r.addEventListener(click)@4071"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#r:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#r.onclick@3876"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#r:dispose",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#M@3575"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#r:dispose",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#o@5"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#r:error",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#l@3575"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#r:keydown",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#r.addEventListener(keydown)@4170"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#r:load",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#c@3575"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#s(.sheet-close):click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#s(.sheet-close).addEventListener(click)@4525"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#s(form):submit",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#s(form).addEventListener(submit)@4525"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#s:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#o@5"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#s:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#s.addEventListener(click)@4038"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#s:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#s.onclick@3876"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#s:end",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#$@3804"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#s:input",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#s.addEventListener(input)@4337"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#s:inputsourceschange",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#et@3804"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#s:keydown",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#s.addEventListener(keydown)@4049"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#s:message",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#s.onmessage@3829"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#s:select",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#F@3804"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#s:selectend",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#F@3804"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#s:selectstart",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#F@3804"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#s:squeeze",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#F@3804"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#s:squeezeend",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#F@3804"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#s:squeezestart",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#F@3804"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#t(.sheet-close):click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#t(.sheet-close).addEventListener(click)@4553"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#t([data-act=\"done\"]):click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#t([data-act=\"done\"]).addEventListener(click)@4337"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#t([data-act=\"guide\"]):click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#t([data-act=\"guide\"]).addEventListener(click)@4337"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#t([data-act=\"install\"]):click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#t([data-act=\"install\"]).addEventListener(click)@4337"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#t([data-act=\"invite\"]):click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#t([data-act=\"invite\"]).addEventListener(click)@4337"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#t([data-act=\"journal\"]):click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#t([data-act=\"journal\"]).addEventListener(click)@4337"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#t([data-act=\"random\"]):click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#t([data-act=\"random\"]).addEventListener(click)@4337"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#t([data-live]):click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#t([data-live]).addEventListener(click)@4553"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#t([data-next]):click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#t([data-next]).addEventListener(click)@4553"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#t.canvas:webglcontextcreationerror",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#kt@3828"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#t.canvas:webglcontextlost",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#dt@3828"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#t.canvas:webglcontextrestored",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#Rt@3828"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#t.querySelector(button):click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#t.querySelector(button).addEventListener(click)@4662"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#t:click",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#t.addEventListener(click)@4662"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#t:contextmenu",
      "kind": "handled-by",
      "to": "fn:didenchua.online/assets/main-CPNz0KLo.js#t.addEventListener(contextmenu)@3829"
    },
    {
      "from": "event:didenchua.online/assets/main-CPNz0KLo.js#t:input",
      "kind": "handled-by",
      "to": "fn:didenchua.online
```

## Ten seconds of it

Watched https://didenchua.online/?phong=chua-1 for 10000ms: 0 request outline(s), 1 console entr(y/ies).

Evidence ev_51fa4807df013149ece85d3ac0c8886b6a949c461f66161c20be1d65deb26bc1.

```json
{
  "accessibility": null,
  "console": {
    "count": 1,
    "entries": [
      {
        "level": "info",
        "source": "other"
      }
    ],
    "has_text": false
  },
  "dom": {
    "attribute_names": [
      "aria-hidden",
      "aria-label",
      "aria-live",
      "async",
      "autocomplete",
      "charset",
      "class",
      "content",
      "crossorigin",
      "cx",
      "cy",
      "d",
      "data-act",
      "data-at",
      "data-cf-beacon",
      "data-d",
      "data-emote",
      "data-engine",
      "data-id",
      "data-menu",
      "data-region",
      "data-tab",
      "enterkeyhint",
      "fill",
      "height",
      "hidden",
      "href",
      "id",
      "integrity",
      "lang",
      "maxlength",
      "min",
      "name",
      "offset",
      "opacity",
      "placeholder",
      "property",
      "r",
      "rel",
      "role",
      "rx",
      "ry",
      "src",
      "step",
      "stop-color",
      "stroke",
      "stroke-linecap",
      "stroke-linejoin",
      "stroke-width",
      "style",
      "title",
      "type",
      "value",
      "viewbox",
      "width",
      "x",
      "y"
    ],
    "elements_by_name": {
      "b": 1,
      "body": 1,
      "button": 115,
      "canvas": 1,
      "circle": 49,
      "defs": 1,
      "div": 132,
      "ellipse": 10,
      "head": 1,
      "html": 1,
      "i": 74,
      "input": 4,
      "link": 8,
      "meta": 12,
      "nav": 1,
      "p": 2,
      "path": 155,
      "radialgradient": 1,
      "rect": 10,
      "script": 4,
      "small": 1,
      "span": 75,
      "stop": 3,
      "svg": 82,
      "title": 1
    },
    "text_nodes": 113,
    "total_nodes": 860,
    "truncated": false
  },
  "dropped_events": 0,
  "frame_origins": [
    "https://didenchua.online"
  ],
  "network": {
    "request_count": 0,
    "requests": []
  },
  "origin": "https://didenchua.online/?phong=chua-1",
  "resources": [
    {
      "mime_type": "font/woff2",
      "type": "Font",
      "url": "https://fonts.gstatic.com/s/lora/v37/0QIvMX1D_JOuMwT7I-NP.woff2"
    },
    {
      "mime_type": "text/javascript",
      "type": "Script",
      "url": "https://didenchua.online/assets/modulepreload-polyfill-B5Qt9EMX.js"
    },
    {
      "mime_type": "font/woff2",
      "type": "Font",
      "url": "https://fonts.gstatic.com/s/bevietnampro/v12/QdVMSTAyLFyeg_IDWvOJmVES_HTEJm87Rb0bcw.woff2"
    },
    {
      "mime_type": "font/woff2",
      "type": "Font",
      "url": "https://fonts.gstatic.com/s/bevietnampro/v12/QdVMSTAyLFyeg_IDWvOJmVES_HTEJm86Rb0bcw.woff2"
    },
    {
      "mime_type": "text/css",
      "type": "Stylesheet",
      "url": "https://didenchua.online/assets/main-DWI8sA1o.css"
    },
    {
      "mime_type": "text/css",
      "type": "Stylesheet",
      "url": "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&family=Lora:wght@500;600&display=swap"
    },
    {
      "mime_type": "font/woff2",
      "type": "Font",
      "url": "https://fonts.gstatic.com/s/bevietnampro/v12/QdVPSTAyLFyeg_IDWvOJmVES_Hw4BXoKZA.woff2"
    },
    {
      "mime_type": "font/woff2",
      "type": "Font",
      "url": "https://fonts.gstatic.com/s/lora/v37/0QIvMX1D_JOuMwr7Iw.woff2"
    },
    {
      "mime_type": "text/javascript",
      "type": "Script",
      "url": "https://didenchua.online/assets/main-CPNz0KLo.js"
    },
    {
      "mime_type": "image/webp",
      "type": "Image",
      "url": "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA"
    },
    {
      "mime_type": "font/woff2",
      "type": "Font",
      "url": "https://fonts.gstatic.com/s/bevietnampro/v12/QdVMSTAyLFyeg_IDWvOJmVES_HTEJm81Rb0.woff2"
    },
    {
      "mime_type": "font/woff2",
      "type": "Font",
      "url": "https://fonts.gstatic.com/s/bevietnampro/v12/QdVPSTAyLFyeg_IDWvOJmVES_Hw5BXoKZA.woff2"
    },
    {
      "mime_type": "text/javascript",
      "type": "Script",
      "url": "https://static.cloudflareinsights.com/beacon.min.js/vce701823e78c4301a35b7e07294d87301792088814092"
    },
    {
      "mime_type": "font/woff2",
      "type": "Font",
      "url": "https://fonts.gstatic.com/s/lora/v37/0QIvMX1D_JOuMwX7I-NP.woff2"
    },
    {
      "mime_type": "font/woff2",
      "type": "Font",
      "url": "https://fonts.gstatic.com/s/bevietnampro/v12/QdVMSTAyLFyeg_IDWvOJmVES_HToIW81Rb0.woff2"
    },
    {
      "mime_type": "application/javascript",
      "type": "Script",
      "url": "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    },
    {
      "mime_type": "font/woff2",
      "type": "Font",
      "url": "https://fonts.gstatic.com/s/bevietnampro/v12/QdVPSTAyLFyeg_IDWvOJmVES_Hw3BXo.woff2"
    },
    {
      "mime_type": "font/woff2",
      "type": "Font",
      "url": "https://fonts.gstatic.com/s/bevietnampro/v12/QdVMSTAyLFyeg_IDWvOJmVES_HToIW86Rb0bcw.woff2"
    },
    {
      "mime_type": "font/woff2",
      "type": "Font",
      "url": "https://fonts.gstatic.com/s/bevietnampro/v12/QdVMSTAyLFyeg_IDWvOJmVES_HToIW87Rb0bcw.woff2"
    }
  ],
  "scripts": [
    {
      "length": 711,
      "source_map_url": null,
      "url": "https://didenchua.online/assets/modulepreload-polyfill-B5Qt9EMX.js"
    },
    {
      "length": 547,
      "source_map_url": null,
      "url": "https://didenchua.online/?phong=chua-1"
    },
    {
      "length": 1306941,
      "source_map_url": null,
      "url": "https://didenchua.online/assets/main-CPNz0KLo.js"
    },
    {
      "length": 31853,
      "source_map_url": null,
      "url": "https://static.cloudflareinsights.com/beacon.min.js/vce701823e78c4301a35b7e07294d87301792088814092"
    },
    {
      "length": 86968,
      "source_map_url": null,
      "url": "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    }
  ],
  "scripts_truncated": false,
  "secret_redactions": 0,
  "storage_keys": null,
  "watch_ms": 10000,
  "websockets": {
    "connections": [],
    "frames": []
  }
}
```
