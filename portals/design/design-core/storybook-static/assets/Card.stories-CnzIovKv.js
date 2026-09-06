import{j as c}from"./jsx-runtime-D_zvdyIk.js";const m={none:"0",sm:"var(--p31-space-sm)",md:"var(--p31-space-md)",lg:"var(--p31-space-lg)",xl:"var(--p31-space-xl)"};function t({children:l,padding:d="md",interactive:a=!1,className:i="",onClick:o}){return c.jsx("div",{className:`glass-card ${a?"glass-card-hover":""} ${i}`.trim(),style:{padding:m[d],cursor:a?"pointer":void 0},onClick:o,children:l})}t.__docgenInfo={description:"Elevated glass surface. Use `interactive` for click-through cards.",methods:[],displayName:"Card",props:{children:{required:!0,tsType:{name:"ReactNode"},description:""},padding:{required:!1,tsType:{name:"union",raw:"'none' | 'sm' | 'md' | 'lg' | 'xl'",elements:[{name:"literal",value:"'none'"},{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"},{name:"literal",value:"'lg'"},{name:"literal",value:"'xl'"}]},description:"Padding scale token suffix (sm | md | lg | xl)",defaultValue:{value:"'md'",computed:!1}},interactive:{required:!1,tsType:{name:"boolean"},description:"Interactive cards get hover elevation",defaultValue:{value:"false",computed:!1}},className:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"''",computed:!1}},onClick:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};const u={title:"Primitives/Card",component:t,tags:["autodocs"]},e={args:{padding:"md",interactive:!0,children:"Glass card content"},argTypes:{padding:{control:"radio",options:["none","sm","md","lg","xl"]}}};var r,n,s;e.parameters={...e.parameters,docs:{...(r=e.parameters)==null?void 0:r.docs,source:{originalSource:`{
  args: {
    "padding": "md",
    "interactive": true,
    "children": "Glass card content"
  } as never,
  argTypes: {
    "padding": {
      "control": "radio",
      "options": ["none", "sm", "md", "lg", "xl"]
    }
  }
}`,...(s=(n=e.parameters)==null?void 0:n.docs)==null?void 0:s.source}}};const g=["Default"];export{e as Default,g as __namedExportsOrder,u as default};
