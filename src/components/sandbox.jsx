import { Sandpack } from "@codesandbox/sandpack-react";
export default function CodeEditor() {
  return (
    <Sandpack 
      template="react" 
      files={{
        "/button.js": `export default () => <button>Click me</button>`
      }} 
    />
  );
}