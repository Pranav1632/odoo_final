import React from 'react';

export const renderToBuffer = jest.fn().mockImplementation(async () => {
  return Buffer.from('%PDF-1.4 Payslip PDF Content Document Test');
});

export const Document = (props: any) => React.createElement('Document', props);
export const Page = (props: any) => React.createElement('Page', props);
export const Text = (props: any) => React.createElement('Text', props);
export const View = (props: any) => React.createElement('View', props);
export const StyleSheet = {
  create: (styles: any) => styles,
};
