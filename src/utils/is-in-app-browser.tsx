import InAppSpy from 'inapp-spy';

export const isInAppBrowser = (): boolean => {
  const { isInApp } = InAppSpy();
  return isInApp;
};
