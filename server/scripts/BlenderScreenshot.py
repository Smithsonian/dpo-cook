import bpy
import json
import os
import sys

# get rid of default mesh objects
for ob in bpy.context.scene.objects:
    if ob.type == 'MESH':
        ob.select_set(True)

#bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.outliner.orphans_purge()
bpy.ops.outliner.orphans_purge()
bpy.ops.outliner.orphans_purge()

#get args
argv = sys.argv
argv = argv[argv.index("--") + 1:]

#get import file extension
filename, file_extension = os.path.splitext(argv[0])
file_extension = file_extension.lower()

#import scene
if file_extension == '.obj':
    bpy.ops.wm.obj_import(filepath=argv[0])
elif file_extension == '.ply':
    bpy.ops.import_mesh.ply(filepath=argv[0])
elif file_extension == '.stl':
    bpy.ops.import_mesh.stl(filepath=argv[0])
elif file_extension == '.x3d':
    bpy.ops.import_scene.x3d(filepath=argv[0])
elif file_extension == '.dae':
    bpy.ops.wm.collada_import(filepath=argv[0])
elif file_extension == '.fbx':
    bpy.ops.import_scene.fbx(filepath=argv[0])
elif file_extension == '.glb' or file_extension == '.gltf':
    bpy.ops.import_scene.gltf(filepath=argv[0])
else:
    print("Error: Unsupported file type: " + file_extension)
    sys.exit(1)

if len(bpy.data.objects) > 0:
    bpy.context.scene.camera = bpy.context.scene.objects.get('Camera')
    dir = os.path.dirname(filename)
    save_file = os.path.join(dir, "preview.png")
    print("Writing preview image: " + save_file)
    bpy.ops.view3d.camera_to_view_selected()

# Set render engine to Cycles
bpy.context.scene.render.engine = 'CYCLES'
bpy.context.preferences.addons['cycles'].preferences.compute_device_type = 'CUDA'
bpy.context.scene.cycles.device = 'GPU'

bpy.context.scene.render.filepath = save_file
bpy.ops.render.render(write_still = True)
