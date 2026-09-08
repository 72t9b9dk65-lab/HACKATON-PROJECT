import Foundation
import Vision
import AppKit
import PDFKit

func recognize(_ image: CGImage) throws -> String {
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = false
  request.recognitionLanguages = ["en-US", "sv-SE"]
  try VNImageRequestHandler(cgImage:image,options:[:]).perform([request])
  return (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator:"\n")
}
do {
  guard CommandLine.arguments.count == 2 else { throw NSError(domain:"Receipt",code:1) }
  let url=URL(fileURLWithPath:CommandLine.arguments[1])
  var text=""
  if url.pathExtension.lowercased()=="pdf", let pdf=PDFDocument(url:url) {
    guard pdf.pageCount <= 8 else { throw NSError(domain:"Use a receipt with at most eight pages.",code:2) }
    for index in 0..<pdf.pageCount {
      guard let page=pdf.page(at:index) else { continue }
      if let extracted=page.string, extracted.trimmingCharacters(in:.whitespacesAndNewlines).count > 30 {text += extracted+"\n"}
      else {
        let image=page.thumbnail(of:NSSize(width:1800,height:2400),for:.mediaBox)
        if let cg=image.cgImage(forProposedRect:nil,context:nil,hints:nil){text += try recognize(cg)+"\n"}
      }
    }
  } else if let image=NSImage(contentsOf:url),let cg=image.cgImage(forProposedRect:nil,context:nil,hints:nil){text=try recognize(cg)}
  else {throw NSError(domain:"Could not read this document.",code:3)}
  let result:[String:Any] = ["text":text,"engine":"Apple Vision · on device"]
  let json=try JSONSerialization.data(withJSONObject:result)
  FileHandle.standardOutput.write(json)
} catch {FileHandle.standardError.write(Data(error.localizedDescription.utf8));exit(1)}
