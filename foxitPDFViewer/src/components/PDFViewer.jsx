import { createElement, useRef, useEffect, useState } from "react";

import loadStyleLink from "../shared/loadStyleLink";

const libPath = "/resources/@foxitsoftware/foxit-pdf-sdk-for-web-library/lib/";
const pdfViewCtrlSrc = libPath + "PDFViewCtrl.full.js";

function loadPDFViewCtrl() {
  if (window.PDFViewCtrl) {
    return Promise.resolve(window.PDFViewCtrl);
  }
  if (window.__foxitPDFViewCtrlLoading) {
    return window.__foxitPDFViewCtrlLoading;
  }

  window.__foxitPDFViewCtrlLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = pdfViewCtrlSrc;
    script.async = false;

    // PDFViewCtrl.full.js is UMD. If an AMD define is present it will not
    // attach PDFViewCtrl to window, so clear define.amd only while this script runs.
    const amdDefine = window.define;
    const previousAmd = amdDefine && amdDefine.amd;
    if (previousAmd) {
      amdDefine.amd = undefined;
    }
    const restoreAmd = () => {
      if (previousAmd) {
        amdDefine.amd = previousAmd;
      }
    };

    script.onload = () => {
      restoreAmd();
      if (window.PDFViewCtrl) {
        resolve(window.PDFViewCtrl);
        return;
      }
      reject(new Error("PDFViewCtrl was not found after loading " + pdfViewCtrlSrc));
    };
    script.onerror = () => {
      restoreAmd();
      window.__foxitPDFViewCtrlLoading = null;
      reject(new Error("Failed to load " + pdfViewCtrlSrc));
    };
    document.head.appendChild(script);
  });

  return window.__foxitPDFViewCtrlLoading;
}

export default function PDFViewer(props) {
  loadStyleLink(libPath + 'PDFViewCtrl.css');

  const viewerRef = useRef(null);
  const [_PDFViewCtrl, setPDFViewCtrl] = useState(null);
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadPDFViewCtrl()
      .then(PDFViewCtrl => {
        if (!cancelled) {
          setPDFViewCtrl(() => PDFViewCtrl);
        }
      })
      .catch(error => {
        console.error(error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!_PDFViewCtrl || !viewerRef.current || viewer) {
      return;
    }

    const ePdfViewer = viewerRef.current;
    const pdfViewer = new _PDFViewCtrl.PDFViewer({
      libPath: libPath,
      jr: {
        licenseSN: props.licenseSN,
        licenseKey: props.licenseKey,
        l: props.l,
        fontPath: props.fontPath,
      },
      customs: {
        ScrollWrap: _PDFViewCtrl.CustomScrollWrap.create(ePdfViewer)
      }
    });

    pdfViewer.init(ePdfViewer);

    setViewer(pdfViewer);
  }, [_PDFViewCtrl, viewer]);

  useEffect(() => {
    if (!viewer) {
      return;
    }

    if (props.fileUrl) {
      viewer.openPDFByHttpRangeRequest({
        range: {
            url: props.fileUrl,
        }
      }).catch((ex) => {
        reopenPDF(viewer, ex);
      });
    } else if (props.file) {
      viewer.openPDFByFile(props.file);
    }
  }, [viewer, props.fileUrl, props.file]);

  window.onresize = function () {
    if (viewer) {
      viewer.redraw();
    }
  }

  // return (createElement("div", { style: { overflow: "auto", height: props.height }, ref: viewerRef }));
  return (
      <div style={{ overflow: "auto", height: props.height }}
          ref={viewerRef}
      ></div>
  );
}

function reopenPDF (viewer, ex) {
    var password = prompt("This PDF document is encrypted, please input the password.")
    if (password) {
        viewer.reopenPDFDoc(ex.pdfDoc, {
        password
        }).catch((ex) => {
            if (ex && ex?.error === 3) {
                reopenPDF(viewer, ex);
            }
        });
    }
}
