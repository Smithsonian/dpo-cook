import bpy
import json
import os
import sys

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

try: #check for provided output filename
    mod_filename, file_extension = os.path.splitext(argv[1])
    file_extension = file_extension.lower()
except IndexError:
    mod_filename = filename

# saving usdz as usdc for now and zipping later
if file_extension == '.usdz':
    file_extension = '.usdc'
    
print("Exporting file: " + mod_filename)
if len(bpy.data.objects) > 0:
    path = bpy.data.filepath
    dir = os.path.dirname(path)
    save_file = os.path.join(dir, mod_filename + file_extension)
    print("Saving file: " + save_file)

    #export scene
    if file_extension == '.obj':
        bpy.ops.wm.obj_export(filepath=save_file, check_existing=False, export_materials=True, path_mode='COPY')
    elif file_extension == '.ply':
        bpy.ops.export_mesh.ply(filepath=save_file)
    elif file_extension == '.stl':
        bpy.ops.export_mesh.stl(filepath=save_file)
    elif file_extension == '.usdc':
        bpy.ops.wm.usd_export(filepath=save_file, check_existing=False, export_materials=True, generate_preview_surface=True, export_textures=True, relative_paths=True)
    elif file_extension == '.fbx':
        bpy.ops.export_scene.fbx(filepath=save_file, check_existing=False, path_mode="COPY", embed_textures=True)
    else:
        print("Error: Unsupported export file type: " + file_extension)
        sys.exit(1)
