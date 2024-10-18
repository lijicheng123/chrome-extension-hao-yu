import React from 'react';
import { Tabs, Button } from 'antd'
import Prompt from './components/prompt'
function options() {
  const tabItems = [
    {
      label: 'Prompt',
      key: 'prompt',
      children: <Prompt />
    }
  ]
  return (
    <div>
      <Tabs
        tabPosition="left"
        items={tabItems}
      />
    </div>
  );
}

export default options;
