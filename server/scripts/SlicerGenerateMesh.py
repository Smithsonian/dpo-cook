import slicer.util
import numpy as np

#get args
argv = sys.argv

dicomDataDir = argv[1];
loadedNodeIDs = []  # this list will contain the list of all loaded node IDs

from DICOMLib import DICOMUtils
with DICOMUtils.TemporaryDICOMDatabase() as db:
  DICOMUtils.importDicom(dicomDataDir, db)
  patientUIDs = db.patients()
  for patientUID in patientUIDs:
    loadedNodeIDs.extend(DICOMUtils.loadPatientByUID(patientUID))

#volumeNode = slicer.mrmlScene.GetFirstNodeByClass('vtkMRMLScalarVolumeNode')
allVolumeNodes = slicer.util.getNodesByClass('vtkMRMLScalarVolumeNode')
if len(allVolumeNodes) > 1:
  cArray = slicer.util.arrayFromVolume(allVolumeNodes[0])
  for idx, volumeNode in enumerate(allVolumeNodes):
    if idx > 0:
      b = slicer.util.arrayFromVolume(volumeNode)
      cArray = np.append(b,cArray,axis=0)    
  combinedVolume = slicer.modules.volumes.logic().CloneVolume(allVolumeNodes[0], "TotalVolume")
  slicer.util.updateVolumeFromArray(combinedVolume, cArray)
else:
  combinedVolume = allVolumeNodes[0]

# Create segmentation
segmentationNode = slicer.mrmlScene.AddNewNodeByClass("vtkMRMLSegmentationNode")
segmentationNode.CreateDefaultDisplayNodes() # only needed for display
segmentationNode.SetReferenceImageGeometryParameterFromVolumeNode(combinedVolume)
newName = "FinalModel"
addedSegmentID = segmentationNode.GetSegmentation().AddEmptySegment(newName)

# Create segment editor to get access to effects
segmentEditorWidget = slicer.qMRMLSegmentEditorWidget()
segmentEditorWidget.setMRMLScene(slicer.mrmlScene)
segmentEditorNode = slicer.mrmlScene.AddNewNodeByClass("vtkMRMLSegmentEditorNode")
segmentEditorWidget.setMRMLSegmentEditorNode(segmentEditorNode)
segmentEditorWidget.setSegmentationNode(segmentationNode)
segmentEditorWidget.setSourceVolumeNode(combinedVolume)

# Thresholding
segmentEditorWidget.setActiveEffectByName("Threshold")
effect = segmentEditorWidget.activeEffect()
effect.setParameter("MinimumThreshold","-800") #-900
effect.setParameter("MaximumThreshold","2030") #1030
effect.self().onApply()

# Smoothing
#segmentEditorWidget.setActiveEffectByName("Smoothing")
#effect = segmentEditorWidget.activeEffect()
#effect.setParameter("SmoothingMethod", "MEDIAN")
#effect.setParameter("KernelSizeMm", 11)
#effect.self().onApply()

# Clean up
segmentEditorWidget = None
slicer.mrmlScene.RemoveNode(segmentEditorNode)

# Make segmentation results visible in 3D
segmentationNode.CreateClosedSurfaceRepresentation()

slicer.vtkSlicerSegmentationsModuleLogic.ExportSegmentsClosedSurfaceRepresentationToFiles("d:/", segmentationNode, None, "STL")

#sys.exit(0)
