import bpy
import json
import os
import sys

def importModel(file_path, file_extension):
    #import scene
    if file_extension == '.obj':
        bpy.ops.wm.obj_import(filepath=file_path)
        sel = bpy.context.selected_objects
        #for obj in sel:
        #    obj.rotation_euler = (0.0,0.0,0.0)
    elif file_extension == '.ply':
        bpy.ops.import_mesh.ply(filepath=file_path)
    elif file_extension == '.stl':
        bpy.ops.import_mesh.stl(filepath=file_path)
    elif file_extension == '.x3d':
        bpy.ops.import_scene.x3d(filepath=file_path)
    elif file_extension == '.dae':
        bpy.ops.wm.collada_import(filepath=file_path)
    elif file_extension == '.fbx':
        bpy.ops.import_scene.fbx(filepath=file_path)
    elif file_extension == '.glb' or file_extension == '.gltf':
        bpy.ops.import_scene.gltf(filepath=file_path)
    else:
        print("Error: Unsupported file type: " + file_extension)
        sys.exit(1)

# get rid of default objects
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.outliner.orphans_purge()
bpy.ops.outliner.orphans_purge()
bpy.ops.outliner.orphans_purge()

#get args
argv = sys.argv
argv = argv[argv.index("--") + 1:]

#get import file extension
#import
filename, file_extension = os.path.splitext(argv[0])
file_extension = file_extension.lower()
importModel(argv[0], file_extension)
new_name = argv[3]

if argv[1] != "":
    filename2, file_extension2 = os.path.splitext(argv[1])
    file_extension2 = file_extension2.lower()
    importModel(argv[1], file_extension2)

#rename most recent import
for obj in bpy.context.selected_objects:
    obj.name = new_name

try: #check for provided output filename
    mod_filename, file_extension = os.path.splitext(argv[2])
except IndexError:
    mod_filename = filename
    
print("Exporting file: " + mod_filename)
if len(bpy.data.objects) > 0:
    path = bpy.data.filepath
    dir = os.path.dirname(path)
    save_file = os.path.join(dir, mod_filename + ".fbx")
    print("Saving file: " + save_file)
    bpy.ops.export_scene.fbx(filepath=save_file, check_existing=False, path_mode="COPY", embed_textures=True)
