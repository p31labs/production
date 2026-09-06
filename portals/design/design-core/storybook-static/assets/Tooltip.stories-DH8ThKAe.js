import{j as o}from"./jsx-runtime-D_zvdyIk.js";import{r as a}from"./iframe-DUMvxUKi.js";import"./preload-helper-Dp1pzeXC.js";function c({content:s,children:d,placement:u="top",className:m=""}){const[n,e]=a.useState(!1),r=a.useId();return o.jsxs("span",{className:`tooltip-trigger ${m}`.trim(),onMouseEnter:()=>e(!0),onMouseLeave:()=>e(!1),onFocus:()=>e(!0),onBlur:()=>e(!1),children:[d,n&&o.jsx("span",{role:"tooltip",id:r,className:`tooltip ${u==="bottom"?"tooltip-below":""}`,children:s}),!n&&o.jsx("span",{id:r,className:"sr-only",children:s})]})}c.__docgenInfo={description:`Hover + focus tooltip. Content is wired via aria-describedby so screen
readers announce it on focus; pointer users get the visual bubble.`,methods:[],displayName:"Tooltip",props:{content:{required:!0,tsType:{name:"ReactNode"},description:"Tooltip content (text or node)"},children:{required:!0,tsType:{name:"ReactNode"},description:""},placement:{required:!1,tsType:{name:"union",raw:"'top' | 'bottom'",elements:[{name:"literal",value:"'top'"},{name:"literal",value:"'bottom'"}]},description:"Show below the trigger instead of above",defaultValue:{value:"'top'",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}}}};const h={title:"Primitives/Tooltip",component:c,tags:["autodocs"]},t={args:{content:"You can do this",placement:"top",children:"Affirm"},argTypes:{placement:{control:"radio",options:["top","bottom"]}}};var i,l,p;t.parameters={...t.parameters,docs:{...(i=t.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    "content": "You can do this",
    "placement": "top",
    "children": "Affirm"
  } as never,
  argTypes: {
    "placement": {
      "control": "radio",
      "options": ["top", "bottom"]
    }
  }
}`,...(p=(l=t.parameters)==null?void 0:l.docs)==null?void 0:p.source}}};const v=["Default"];export{t as Default,v as __namedExportsOrder,h as default};
