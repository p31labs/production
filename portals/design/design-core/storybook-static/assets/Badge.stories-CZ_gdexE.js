import{j as l}from"./jsx-runtime-D_zvdyIk.js";const c={success:"badge-success",warning:"badge-warning",error:"badge-error",info:"badge-info",neutral:""};function s({tone:o="neutral",children:t,className:i=""}){return l.jsx("span",{className:`badge ${c[o]} ${i}`.trim(),children:t})}s.__docgenInfo={description:"Compact status label. Crisis mode keeps colors but forces opaque surfaces.",methods:[],displayName:"Badge",props:{tone:{required:!1,tsType:{name:"union",raw:"'success' | 'warning' | 'error' | 'info' | 'neutral'",elements:[{name:"literal",value:"'success'"},{name:"literal",value:"'warning'"},{name:"literal",value:"'error'"},{name:"literal",value:"'info'"},{name:"literal",value:"'neutral'"}]},description:"",defaultValue:{value:"'neutral'",computed:!1}},children:{required:!0,tsType:{name:"ReactNode"},description:""},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}}}};const d={title:"Primitives/Badge",component:s,tags:["autodocs"]},e={args:{tone:"success",children:"online"},argTypes:{tone:{control:"radio",options:["success","warning","error","info","neutral"]}}};var r,a,n;e.parameters={...e.parameters,docs:{...(r=e.parameters)==null?void 0:r.docs,source:{originalSource:`{
  args: {
    "tone": "success",
    "children": "online"
  } as never,
  argTypes: {
    "tone": {
      "control": "radio",
      "options": ["success", "warning", "error", "info", "neutral"]
    }
  }
}`,...(n=(a=e.parameters)==null?void 0:a.docs)==null?void 0:n.source}}};const m=["Default"];export{e as Default,m as __namedExportsOrder,d as default};
