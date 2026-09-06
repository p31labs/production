import{j as s}from"./jsx-runtime-D_zvdyIk.js";const t={sm:"spinner-sm",md:"spinner-md",lg:"spinner-lg"};function r({size:l="md",label:d="Loading",className:o=""}){return s.jsxs("span",{className:o,style:{display:"inline-flex"},role:"status",children:[s.jsx("span",{className:`spinner ${t[l]}`,"aria-hidden":"true"}),s.jsx("span",{className:"sr-only",children:d})]})}r.__docgenInfo={description:"Loading indicator. Animation is disabled under reduced-motion and crisis mode.",methods:[],displayName:"Spinner",props:{size:{required:!1,tsType:{name:"union",raw:"'sm' | 'md' | 'lg'",elements:[{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"},{name:"literal",value:"'lg'"}]},description:"",defaultValue:{value:"'md'",computed:!1}},label:{required:!1,tsType:{name:"string"},description:"Accessible loading label; rendered visually hidden",defaultValue:{value:"'Loading'",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}}}};const p={title:"Primitives/Spinner",component:r,tags:["autodocs"]},e={args:{size:"md",label:"Loading"},argTypes:{size:{control:"radio",options:["sm","md","lg"]}}};var a,n,i;e.parameters={...e.parameters,docs:{...(a=e.parameters)==null?void 0:a.docs,source:{originalSource:`{
  args: {
    "size": "md",
    "label": "Loading"
  } as never,
  argTypes: {
    "size": {
      "control": "radio",
      "options": ["sm", "md", "lg"]
    }
  }
}`,...(i=(n=e.parameters)==null?void 0:n.docs)==null?void 0:i.source}}};const u=["Default"];export{e as Default,u as __namedExportsOrder,p as default};
